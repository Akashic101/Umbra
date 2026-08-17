import { describe, expect, it } from "vitest";
import {
	getLocationPermissionState,
	mapLocationPermission,
} from "./location-permission";

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
});
