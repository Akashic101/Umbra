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

export function createGeolocationService(
	deps: GeolocationDeps = {},
): GeolocationService {
	return {
		getCurrentPosition() {
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

			return new Promise<GeoPosition>((resolve, reject) => {
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
					{
						enableHighAccuracy: true,
						timeout: 15_000,
						maximumAge: 60_000,
					},
				);
			});
		},
	};
}

export const geolocation = createGeolocationService();
