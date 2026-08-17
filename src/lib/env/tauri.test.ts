import { describe, expect, it } from "vitest";
import {
	isTauriMacos,
	isTauriMobile,
	locationSettingsUrl,
	pathFromDeepLink,
	toShareHref,
} from "./tauri";

describe("toShareHref", () => {
	const page = new URL("https://example.com/details?date=2026-08-12&lat=48.1");

	it("keeps the https URL on the web", () => {
		expect(toShareHref(page, false)).toBe(page.href);
	});

	it("uses the umbra scheme in the native app", () => {
		expect(toShareHref(page, true)).toBe(
			"umbra:/details?date=2026-08-12&lat=48.1",
		);
	});
});

describe("pathFromDeepLink", () => {
	it("reads path-style umbra URLs", () => {
		expect(pathFromDeepLink("umbra:/details?date=2026-08-12")).toBe(
			"/details?date=2026-08-12",
		);
	});

	it("reads host-style umbra URLs", () => {
		expect(pathFromDeepLink("umbra://lunar/details?date=2026-03-03")).toBe(
			"/lunar/details?date=2026-03-03",
		);
	});

	it("falls back to home on garbage", () => {
		expect(pathFromDeepLink("not a url")).toBe("/");
	});
});

describe("isTauriMobile", () => {
	it("is false on the web", () => {
		expect(isTauriMobile(false, "ios", "iPhone")).toBe(false);
	});

	it("is true on iOS and Android Tauri builds", () => {
		expect(isTauriMobile(true, "ios", "")).toBe(true);
		expect(isTauriMobile(true, "android", "")).toBe(true);
	});

	it("is false on desktop Tauri", () => {
		expect(isTauriMobile(true, "darwin", "Macintosh")).toBe(false);
		expect(isTauriMobile(true, "macos", "Macintosh")).toBe(false);
	});

	it("falls back to the user agent when the platform env is missing", () => {
		expect(isTauriMobile(true, undefined, "iPhone")).toBe(true);
		expect(isTauriMobile(true, undefined, "Macintosh")).toBe(false);
	});
});

describe("isTauriMacos", () => {
	it("is true on desktop macOS Tauri", () => {
		expect(isTauriMacos(true, "darwin", "Macintosh")).toBe(true);
	});

	it("is false on iOS and the web", () => {
		expect(isTauriMacos(true, "ios", "iPhone")).toBe(false);
		expect(isTauriMacos(false, "darwin", "Macintosh")).toBe(false);
	});
});

describe("locationSettingsUrl", () => {
	it("is null on the web", () => {
		expect(locationSettingsUrl(false, "darwin")).toBeNull();
	});

	it("opens Location Services on macOS", () => {
		expect(locationSettingsUrl(true, "darwin")).toBe(
			"x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_LocationServices",
		);
	});

	it("falls back to the user agent when the platform env is missing", () => {
		expect(
			locationSettingsUrl(true, undefined, "Macintosh; Intel Mac OS X"),
		).toContain("x-apple.systempreferences:");
	});

	it("treats iPad as iOS even when the UA also says Macintosh", () => {
		expect(
			locationSettingsUrl(
				true,
				undefined,
				"Mozilla/5.0 (Macintosh; Intel Mac OS X) iPad",
			),
		).toBe("app-settings:");
	});

	it("opens the app settings page on iOS", () => {
		expect(locationSettingsUrl(true, "ios")).toBe("app-settings:");
	});
});
