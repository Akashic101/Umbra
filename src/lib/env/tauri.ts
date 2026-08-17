export const UMBRA_SCHEME = "umbra";
export const UMBRA_USER_AGENT =
	"Umbra/0.0.1 (https://github.com/Akashic101/Umbra)";

export function isTauri(): boolean {
	return (
		typeof window !== "undefined" &&
		("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
	);
}

/**
 * Native iOS/Android only. Desktop Tauri (macOS/Windows/Linux) has no
 * geolocation plugin; use `navigator.geolocation` there.
 */
export function isTauriMobile(
	native = isTauri(),
	platform = import.meta.env.TAURI_ENV_PLATFORM,
	userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent,
): boolean {
	if (!native) {
		return false;
	}
	if (platform === "ios" || platform === "android") {
		return true;
	}
	return /Android|iPhone|iPad|iPod/i.test(userAgent);
}

const MACOS_LOCATION_SETTINGS =
	"x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_LocationServices";
const IOS_APP_SETTINGS = "app-settings:";
const WINDOWS_LOCATION_SETTINGS = "ms-settings:privacy-location";

function isMacosPlatform(platform: string | undefined): boolean {
	return platform === "darwin" || platform === "macos";
}

export function isTauriMacos(
	native = isTauri(),
	platform = import.meta.env.TAURI_ENV_PLATFORM,
	userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent,
): boolean {
	if (!native || isTauriMobile(native, platform, userAgent)) {
		return false;
	}
	return isMacosPlatform(platform) || /Macintosh|Mac OS X/i.test(userAgent);
}

function isIosUserAgent(userAgent: string): boolean {
	return /iPhone|iPad|iPod/i.test(userAgent);
}

/** System Settings / app settings URL for location permission, or null. */
export function locationSettingsUrl(
	native = isTauri(),
	platform = import.meta.env.TAURI_ENV_PLATFORM,
	userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent,
): string | null {
	if (!native) {
		return null;
	}
	if (platform === "ios" || isIosUserAgent(userAgent)) {
		return IOS_APP_SETTINGS;
	}
	if (isMacosPlatform(platform) || /Macintosh|Mac OS X/i.test(userAgent)) {
		return MACOS_LOCATION_SETTINGS;
	}
	if (
		platform === "windows" ||
		platform === "win32" ||
		/Windows NT/i.test(userAgent)
	) {
		return WINDOWS_LOCATION_SETTINGS;
	}
	return null;
}

/** Opens the OS location-permission pane. No-op on the website. */
export async function openLocationSettings(): Promise<boolean> {
	if (!isTauri()) {
		return false;
	}
	try {
		const { invoke } = await import("@tauri-apps/api/core");
		await invoke("open_location_settings");
		return true;
	} catch {
		const url = locationSettingsUrl();
		if (!url) {
			return false;
		}
		const { openUrl } = await import("@tauri-apps/plugin-opener");
		await openUrl(url);
		return true;
	}
}

/** Public https URL on the web; `umbra:/path?query` inside the native app. */
export function toShareHref(url: URL, native = isTauri()): string {
	if (!native) {
		return url.href;
	}
	return `${UMBRA_SCHEME}:${url.pathname}${url.search}${url.hash}`;
}

/** Map an `umbra:` / https deep link to a SvelteKit path + search. */
export function pathFromDeepLink(raw: string): string {
	try {
		const parsed = new URL(raw);
		if (parsed.protocol === `${UMBRA_SCHEME}:`) {
			const host = parsed.host;
			const pathname =
				parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : "";
			const path = host
				? pathname
					? `/${host}${pathname}`
					: `/${host}`
				: pathname || "/";
			return `${path}${parsed.search}${parsed.hash}`;
		}
		return `${parsed.pathname}${parsed.search}${parsed.hash}` || "/";
	} catch {
		return "/";
	}
}
