import { isTauriMacos, isTauriMobile } from "$lib/env/tauri";
import { m } from "$lib/paraglide/messages.js";

export type GeoPosition = {
	lat: number;
	lon: number;
	height: number;
};

export type GeolocationFailure = {
	code: number;
	message: string;
};

export class GeolocationError extends Error {
	readonly code: number;

	constructor(failure: GeolocationFailure) {
		super(failure.message);
		this.name = "GeolocationError";
		this.code = failure.code;
	}
}

export type GeolocationLike = {
	getCurrentPosition: (
		success: PositionCallback,
		error?: PositionErrorCallback,
		options?: PositionOptions,
	) => void;
};

export type GeolocationService = {
	getCurrentPosition: () => Promise<GeoPosition>;
};

export type GeolocationDeps = {
	geolocation?: GeolocationLike | null;
};

const POSITION_OPTIONS: PositionOptions = {
	enableHighAccuracy: true,
	timeout: 15_000,
	maximumAge: 60_000,
};

async function getMacosNativePosition(): Promise<GeoPosition> {
	const { invoke } = await import("@tauri-apps/api/core");
	try {
		return await invoke<GeoPosition>("get_macos_location");
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const code = message.includes("permission")
			? 1
			: message.includes("timeout")
				? 3
				: 2;
		throw new GeolocationError({
			code,
			message: m.errorUnableCurrentPosition(),
		});
	}
}

async function getTauriPosition(): Promise<GeoPosition> {
	const geo = await import("@tauri-apps/plugin-geolocation");
	let permissions = await geo.checkPermissions();
	if (
		permissions.location === "prompt" ||
		permissions.location === "prompt-with-rationale"
	) {
		permissions = await geo.requestPermissions(["location"]);
	}
	if (permissions.location !== "granted") {
		throw new GeolocationError({
			code: 1,
			message: m.errorUnableCurrentPosition(),
		});
	}
	const pos = await geo.getCurrentPosition({
		enableHighAccuracy: true,
		timeout: 15_000,
		maximumAge: 60_000,
	});
	return {
		lat: pos.coords.latitude,
		lon: pos.coords.longitude,
		height: Number.isFinite(pos.coords.altitude)
			? (pos.coords.altitude as number)
			: 0,
	};
}

function getBrowserPosition(api: GeolocationLike): Promise<GeoPosition> {
	return new Promise((resolve, reject) => {
		api.getCurrentPosition(
			(position) => {
				resolve({
					lat: position.coords.latitude,
					lon: position.coords.longitude,
					height: Number.isFinite(position.coords.altitude)
						? (position.coords.altitude as number)
						: 0,
				});
			},
			(error) => {
				reject(
					new GeolocationError({
						code: error.code,
						message: error.message || m.errorUnableCurrentPosition(),
					}),
				);
			},
			POSITION_OPTIONS,
		);
	});
}

export function createGeolocationService(
	deps: GeolocationDeps = {},
): GeolocationService {
	return {
		async getCurrentPosition() {
			if (!deps.geolocation && isTauriMacos()) {
				return getMacosNativePosition();
			}
			if (!deps.geolocation && isTauriMobile()) {
				try {
					return await getTauriPosition();
				} catch (error) {
					if (error instanceof GeolocationError) {
						throw error;
					}
					// Plugin missing or unimplemented: WebView geolocation.
				}
			}

			const api =
				deps.geolocation ??
				(typeof navigator === "undefined" ? null : navigator.geolocation);
			if (!api) {
				return Promise.reject(
					new GeolocationError({
						code: 0,
						message: m.errorGeolocationUnavailable(),
					}),
				);
			}

			return getBrowserPosition(api);
		},
	};
}

export const geolocation = createGeolocationService();
