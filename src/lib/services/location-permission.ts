import { isTauriMacos, isTauriMobile } from "$lib/env/tauri";

export type LocationPermissionState = "prompt" | "granted" | "denied";

export type LocationPermissionDeps = {
	macos?: boolean;
	mobile?: boolean;
	macosStatus?: () => Promise<string>;
	mobileStatus?: () => Promise<string>;
	browserStatus?: () => Promise<string>;
};

export function mapLocationPermission(value: string): LocationPermissionState {
	if (value === "granted") {
		return "granted";
	}
	if (value === "denied") {
		return "denied";
	}
	return "prompt";
}

export async function getLocationPermissionState(
	deps: LocationPermissionDeps = {},
): Promise<LocationPermissionState> {
	const macos = deps.macos ?? isTauriMacos();
	if (macos) {
		const status = await (deps.macosStatus ?? readMacosStatus)();
		return mapLocationPermission(status);
	}

	const mobile = deps.mobile ?? isTauriMobile();
	if (mobile) {
		const status = await (deps.mobileStatus ?? readMobileStatus)();
		return mapLocationPermission(status);
	}

	try {
		const status = await (deps.browserStatus ?? readBrowserStatus)();
		return mapLocationPermission(status);
	} catch {
		return "prompt";
	}
}

async function readMacosStatus(): Promise<string> {
	const { invoke } = await import("@tauri-apps/api/core");
	return invoke<string>("macos_location_status");
}

async function readMobileStatus(): Promise<string> {
	const geo = await import("@tauri-apps/plugin-geolocation");
	const permissions = await geo.checkPermissions();
	return permissions.location;
}

async function readBrowserStatus(): Promise<string> {
	if (
		typeof navigator === "undefined" ||
		typeof navigator.permissions?.query !== "function"
	) {
		return "prompt";
	}
	const result = await navigator.permissions.query({ name: "geolocation" });
	return result.state;
}
