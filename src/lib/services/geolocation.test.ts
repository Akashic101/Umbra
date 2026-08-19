import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createGeolocationService,
	GeolocationError,
	type GeolocationLike,
} from "./geolocation";

vi.mock("$lib/env/tauri", () => ({
	isTauriMacos: vi.fn(() => false),
	isTauriMobile: vi.fn(() => false),
}));

vi.mock("@tauri-apps/api/core", () => ({
	invoke: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-geolocation", () => ({
	checkPermissions: vi.fn(),
	requestPermissions: vi.fn(),
	getCurrentPosition: vi.fn(),
}));

import { isTauriMacos, isTauriMobile } from "$lib/env/tauri";
import { invoke } from "@tauri-apps/api/core";
import * as tauriGeo from "@tauri-apps/plugin-geolocation";

function stubGeo(position: GeolocationPosition): GeolocationLike {
	return {
		getCurrentPosition(success) {
			success(position);
		},
	};
}

beforeEach(() => {
	vi.mocked(isTauriMacos).mockReturnValue(false);
	vi.mocked(isTauriMobile).mockReturnValue(false);
	vi.mocked(invoke).mockReset();
	vi.mocked(tauriGeo.checkPermissions).mockReset();
	vi.mocked(tauriGeo.requestPermissions).mockReset();
	vi.mocked(tauriGeo.getCurrentPosition).mockReset();
});

describe("createGeolocationService", () => {
	it("reads coordinates from the browser API", async () => {
		const geo = createGeolocationService({
			geolocation: stubGeo({
				coords: {
					latitude: 48.1,
					longitude: 11.6,
					altitude: 520,
					accuracy: 10,
					altitudeAccuracy: null,
					heading: null,
					speed: null,
					toJSON() {
						return {};
					},
				},
				timestamp: 0,
				toJSON() {
					return {};
				},
			}),
		});

		await expect(geo.getCurrentPosition()).resolves.toEqual({
			lat: 48.1,
			lon: 11.6,
			height: 520,
		});
	});

	it("rejects when the browser API is missing", async () => {
		const geo = createGeolocationService({ geolocation: null });
		await expect(geo.getCurrentPosition()).rejects.toBeInstanceOf(
			GeolocationError,
		);
	});

	it("wraps browser errors", async () => {
		const geo = createGeolocationService({
			geolocation: {
				getCurrentPosition(_success, error) {
					error?.({
						code: 1,
						message: "denied",
						PERMISSION_DENIED: 1,
						POSITION_UNAVAILABLE: 2,
						TIMEOUT: 3,
					});
				},
			},
		});

		const failure = await geo.getCurrentPosition().catch((err) => err);
		expect(failure).toBeInstanceOf(GeolocationError);
		expect(failure.code).toBe(1);
	});

	it("uses the default message when the browser error is blank", async () => {
		const geo = createGeolocationService({
			geolocation: {
				getCurrentPosition(_success, error) {
					error?.({
						code: 2,
						message: "",
						PERMISSION_DENIED: 1,
						POSITION_UNAVAILABLE: 2,
						TIMEOUT: 3,
					});
				},
			},
		});
		await expect(geo.getCurrentPosition()).rejects.toMatchObject({ code: 2 });
	});

	it("uses zero height when altitude is missing", async () => {
		const geo = createGeolocationService({
			geolocation: stubGeo({
				coords: {
					latitude: 48.1,
					longitude: 11.6,
					altitude: null,
					accuracy: 10,
					altitudeAccuracy: null,
					heading: null,
					speed: null,
					toJSON() {
						return {};
					},
				},
				timestamp: 0,
				toJSON() {
					return {};
				},
			}),
		});
		await expect(geo.getCurrentPosition()).resolves.toMatchObject({ height: 0 });
	});

	it("uses the macOS native bridge when available", async () => {
		vi.mocked(isTauriMacos).mockReturnValue(true);
		vi.mocked(invoke).mockResolvedValue({
			lat: 48.1,
			lon: 11.6,
			height: 520,
		});
		const geo = createGeolocationService();
		await expect(geo.getCurrentPosition()).resolves.toEqual({
			lat: 48.1,
			lon: 11.6,
			height: 520,
		});
		vi.mocked(isTauriMacos).mockReturnValue(false);
	});

	it("maps macOS bridge failures to geolocation error codes", async () => {
		vi.mocked(isTauriMacos).mockReturnValue(true);
		vi.mocked(invoke).mockRejectedValue(new Error("permission denied"));
		const geo = createGeolocationService();
		await expect(geo.getCurrentPosition()).rejects.toMatchObject({ code: 1 });
		vi.mocked(invoke).mockRejectedValue(new Error("timeout"));
		await expect(geo.getCurrentPosition()).rejects.toMatchObject({ code: 3 });
		vi.mocked(invoke).mockRejectedValue(new Error("other"));
		await expect(geo.getCurrentPosition()).rejects.toMatchObject({ code: 2 });
		vi.mocked(invoke).mockRejectedValue("failed");
		await expect(geo.getCurrentPosition()).rejects.toMatchObject({ code: 2 });
	});

	it("uses the Tauri mobile plugin when available", async () => {
		vi.mocked(isTauriMobile).mockReturnValue(true);
		vi.mocked(tauriGeo.checkPermissions).mockResolvedValue({
			location: "prompt-with-rationale",
		});
		vi.mocked(tauriGeo.requestPermissions).mockResolvedValue({
			location: "granted",
		});
		vi.mocked(tauriGeo.getCurrentPosition).mockResolvedValue({
			coords: {
				latitude: 48.1,
				longitude: 11.6,
				altitude: 520,
				accuracy: 10,
				altitudeAccuracy: null,
				heading: null,
				speed: null,
			},
			timestamp: 0,
		});
		const geoWithAltitude = createGeolocationService();
		await expect(geoWithAltitude.getCurrentPosition()).resolves.toEqual({
			lat: 48.1,
			lon: 11.6,
			height: 520,
		});

		vi.mocked(tauriGeo.getCurrentPosition).mockResolvedValue({
			coords: {
				latitude: 48.1,
				longitude: 11.6,
				altitude: Number.NaN,
				accuracy: 10,
				altitudeAccuracy: null,
				heading: null,
				speed: null,
			},
			timestamp: 0,
		});
		const geo = createGeolocationService();
		await expect(geo.getCurrentPosition()).resolves.toEqual({
			lat: 48.1,
			lon: 11.6,
			height: 0,
		});
	});

	it("rejects when mobile permission is denied", async () => {
		vi.mocked(isTauriMobile).mockReturnValue(true);
		vi.mocked(tauriGeo.checkPermissions).mockResolvedValue({
			location: "denied",
		});
		const geo = createGeolocationService();
		await expect(geo.getCurrentPosition()).rejects.toBeInstanceOf(
			GeolocationError,
		);
	});

	it("rethrows mobile GeolocationError instances", async () => {
		vi.mocked(isTauriMobile).mockReturnValue(true);
		vi.mocked(tauriGeo.checkPermissions).mockRejectedValue(
			new GeolocationError({ code: 2, message: "failed" }),
		);
		const geo = createGeolocationService();
		await expect(geo.getCurrentPosition()).rejects.toMatchObject({ code: 2 });
	});

	it("falls back when the mobile plugin is unavailable", async () => {
		vi.mocked(isTauriMobile).mockReturnValue(true);
		vi.mocked(tauriGeo.checkPermissions).mockRejectedValue(
			new Error("plugin missing"),
		);
		const geo = createGeolocationService({ geolocation: null });
		await expect(geo.getCurrentPosition()).rejects.toBeInstanceOf(
			GeolocationError,
		);
	});

	it("falls back to browser geolocation after a mobile plugin failure", async () => {
		vi.mocked(isTauriMobile).mockReturnValue(true);
		vi.mocked(tauriGeo.checkPermissions).mockRejectedValue(
			new Error("plugin missing"),
		);
		const originalNavigator = globalThis.navigator;
		Object.defineProperty(globalThis, "navigator", {
			configurable: true,
			value: {
				geolocation: stubGeo({
					coords: {
						latitude: 48.1,
						longitude: 11.6,
						altitude: 100,
						accuracy: 10,
						altitudeAccuracy: null,
						heading: null,
						speed: null,
						toJSON() {
							return {};
						},
					},
					timestamp: 0,
					toJSON() {
						return {};
					},
				}),
			},
		});
		const geo = createGeolocationService();
		await expect(geo.getCurrentPosition()).resolves.toEqual({
			lat: 48.1,
			lon: 11.6,
			height: 100,
		});
		Object.defineProperty(globalThis, "navigator", {
			configurable: true,
			value: originalNavigator,
		});
	});
});
