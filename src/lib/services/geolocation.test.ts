import { describe, expect, it } from "vitest";
import {
	createGeolocationService,
	GeolocationError,
	type GeolocationLike,
} from "./geolocation";

function stubGeo(position: GeolocationPosition): GeolocationLike {
	return {
		getCurrentPosition(success) {
			success(position);
		},
	};
}

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
});
