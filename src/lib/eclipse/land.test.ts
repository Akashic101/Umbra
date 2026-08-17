import { describe, expect, it } from "vitest";
import { destination, downsampleLatLons } from "./geo";
import {
	closestLandPoint,
	elevationLooksLikeLand,
	nearestLandLocation,
	spiralSearchPoints,
} from "./land";

describe("elevationLooksLikeLand", () => {
	it("treats non-zero DEM heights as land", () => {
		expect(elevationLooksLikeLand(12)).toBe(true);
		expect(elevationLooksLikeLand(-2)).toBe(true);
	});

	it("treats ocean zeros and missing values as not land", () => {
		expect(elevationLooksLikeLand(0)).toBe(false);
		expect(elevationLooksLikeLand(null)).toBe(false);
	});
});

describe("closestLandPoint", () => {
	const origin = { lat: 0, lon: 0 };

	it("picks the nearest non-zero elevation sample", () => {
		const candidates = [
			{ lat: 0, lon: 2 },
			{ lat: 0, lon: 1 },
			{ lat: 0, lon: 3 },
		];
		const hit = closestLandPoint(origin, candidates, [0, 40, 80]);
		expect(hit).toEqual({ lat: 0, lon: 1 });
	});

	it("returns null when every sample is water", () => {
		expect(closestLandPoint(origin, [{ lat: 1, lon: 1 }], [0])).toBeNull();
	});
});

describe("downsampleLatLons", () => {
	it("keeps short polylines intact", () => {
		const points = [
			{ lat: 0, lon: 0 },
			{ lat: 1, lon: 1 },
		];
		expect(downsampleLatLons(points, 80)).toEqual(points);
	});

	it("includes the first and last vertices", () => {
		const points = Array.from({ length: 11 }, (_, i) => ({
			lat: i,
			lon: 0,
		}));
		const sampled = downsampleLatLons(points, 3);
		expect(sampled[0]).toEqual({ lat: 0, lon: 0 });
		expect(sampled.at(-1)).toEqual({ lat: 10, lon: 0 });
		expect(sampled).toHaveLength(3);
	});
});

describe("destination", () => {
	it("moves due north by about 111 km per degree", () => {
		const end = destination({ lat: 0, lon: 10 }, 111.2, 0);
		expect(end.lat).toBeCloseTo(1, 1);
		expect(end.lon).toBeCloseTo(10, 1);
	});
});

describe("nearestLandLocation", () => {
	const origin = { lat: 0, lon: 0 };
	const path = [
		{ lat: 0, lon: 0 },
		{ lat: 0, lon: 1 },
		{ lat: 0, lon: 2 },
	];

	it("keeps the origin when it is already on land", async () => {
		const found = await nearestLandLocation(origin, path, {
			getElevations: async (points) => points.map(() => 120),
		});
		expect(found).toEqual({ point: origin, onLand: true });
	});

	it("snaps to the nearest centerline land sample", async () => {
		const land = { lat: 0, lon: 2 };
		const found = await nearestLandLocation(origin, path, {
			getElevations: async (points) =>
				points.map((point) => (point.lon === land.lon ? 80 : 0)),
		});
		expect(found).toEqual({ point: land, onLand: true });
	});

	it("falls back to a spiral search around the origin", async () => {
		const spiral = spiralSearchPoints(origin);
		const island = spiral[0];
		const found = await nearestLandLocation(origin, [], {
			getElevations: async (points) =>
				points.map((point) =>
					point.lat === island.lat && point.lon === island.lon ? 15 : 0,
				),
		});
		expect(found).toEqual({ point: island, onLand: true });
	});

	it("returns the origin when no land is found", async () => {
		const found = await nearestLandLocation(origin, path, {
			getElevations: async (points) => points.map(() => 0),
		});
		expect(found).toEqual({ point: origin, onLand: false });
	});
});
