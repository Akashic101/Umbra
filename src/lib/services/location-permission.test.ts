import { describe, expect, it, vi } from "vitest";
import {
	getLocationPermissionState,
	mapLocationPermission,
} from "./location-permission";

vi.mock("$lib/env/tauri", () => ({
	isTauriMacos: vi.fn(() => false),
	isTauriMobile: vi.fn(() => false),
}));

vi.mock("@tauri-apps/api/core", () => ({
	invoke: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-geolocation", () => ({
	checkPermissions: vi.fn(),
}));

import { isTauriMacos, isTauriMobile } from "$lib/env/tauri";
import { invoke } from "@tauri-apps/api/core";
import * as tauriGeo from "@tauri-apps/plugin-geolocation";

describe("mapLocationPermission", () => {
	it("maps known states and treats the rest as prompt", () => {
		expect(mapLocationPermission("granted")).toBe("granted");
		expect(mapLocationPermission("denied")).toBe("denied");
		expect(mapLocationPermission("prompt")).toBe("prompt");
		expect(mapLocationPermission("prompt-with-rationale")).toBe("prompt");
	});
});

describe("getLocationPermissionState", () => {
	it("uses the macOS status when that platform is selected", async () => {
		await expect(
			getLocationPermissionState({
				macos: true,
				macosStatus: async () => "granted",
			}),
		).resolves.toBe("granted");
	});

	it("uses the mobile plugin status", async () => {
		await expect(
			getLocationPermissionState({
				macos: false,
				mobile: true,
				mobileStatus: async () => "denied",
			}),
		).resolves.toBe("denied");
	});

	it("falls back to prompt when the browser query fails", async () => {
		await expect(
			getLocationPermissionState({
				macos: false,
				mobile: false,
				browserStatus: async () => {
					throw new Error("unsupported");
				},
			}),
		).resolves.toBe("prompt");
	});

	it("reads macOS status through the native bridge", async () => {
		vi.mocked(invoke).mockResolvedValue("granted");
		await expect(
			getLocationPermissionState({ macos: true }),
		).resolves.toBe("granted");
	});

	it("reads mobile status through the geolocation plugin", async () => {
		vi.mocked(tauriGeo.checkPermissions).mockResolvedValue({
			location: "denied",
		});
		await expect(
			getLocationPermissionState({ macos: false, mobile: true }),
		).resolves.toBe("denied");
	});

	it("reads browser status from the permissions API", async () => {
		const originalNavigator = globalThis.navigator;
		Object.defineProperty(globalThis, "navigator", {
			configurable: true,
			value: {
				permissions: {
					query: vi.fn(async () => ({ state: "granted" })),
				},
			},
		});
		await expect(
			getLocationPermissionState({ macos: false, mobile: false }),
		).resolves.toBe("granted");
		Object.defineProperty(globalThis, "navigator", {
			configurable: true,
			value: originalNavigator,
		});
	});

	it("returns prompt when browser permissions are unavailable", async () => {
		const originalNavigator = globalThis.navigator;
		Object.defineProperty(globalThis, "navigator", {
			configurable: true,
			value: {},
		});
		await expect(
			getLocationPermissionState({ macos: false, mobile: false }),
		).resolves.toBe("prompt");
		Object.defineProperty(globalThis, "navigator", {
			configurable: true,
			value: originalNavigator,
		});
	});

	it("uses platform detection when deps are omitted", async () => {
		vi.mocked(isTauriMacos).mockReturnValue(true);
		vi.mocked(invoke).mockResolvedValue("denied");
		await expect(getLocationPermissionState()).resolves.toBe("denied");
		vi.mocked(isTauriMacos).mockReturnValue(false);
		vi.mocked(isTauriMobile).mockReturnValue(true);
		vi.mocked(tauriGeo.checkPermissions).mockResolvedValue({
			location: "granted",
		});
		await expect(getLocationPermissionState()).resolves.toBe("granted");
	});
});
