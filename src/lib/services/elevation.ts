import type { LatLon } from "$lib/types";
import { type FetchFn, getJson } from "./http";

const ELEVATION_URL = "https://api.open-meteo.com/v1/elevation";
const BATCH_SIZE = 80;

export type ElevationService = {
	/** Terrain elevation in meters (WGS84 / DEM). Null if unavailable. */
	getMeters: (lat: number, lon: number) => Promise<number | null>;
	getMetersMany: (points: LatLon[]) => Promise<(number | null)[]>;
};

export type ElevationDeps = {
	getJson?: typeof getJson;
	fetch?: FetchFn;
};

type ElevationResponse = {
	elevation?: Array<number | null>;
};

function isValidLatLon(point: LatLon): boolean {
	return (
		Number.isFinite(point.lat) &&
		Number.isFinite(point.lon) &&
		Math.abs(point.lat) <= 90 &&
		Math.abs(point.lon) <= 180
	);
}

/**
 * Open-Meteo Elevation API (Copernicus GLO-90 DEM, ~90 m).
 * Free for non-commercial use; CORS-enabled; no API key.
 */
export function createElevationService(
	deps: ElevationDeps = {},
): ElevationService {
	const requestJson = deps.getJson ?? getJson;
	const fetchFn = deps.fetch;

	async function fetchChunk(points: LatLon[]): Promise<(number | null)[]> {
		if (!points.length) {
			return [];
		}
		const url = new URL(ELEVATION_URL);
		url.searchParams.set(
			"latitude",
			points.map((point) => String(point.lat)).join(","),
		);
		url.searchParams.set(
			"longitude",
			points.map((point) => String(point.lon)).join(","),
		);
		try {
			const data = await requestJson<ElevationResponse>(url.toString(), {
				fetch: fetchFn,
				timeoutMs: 8_000,
			});
			return points.map((_, index) => {
				const value = data.elevation?.[index];
				if (typeof value !== "number" || !Number.isFinite(value)) {
					return null;
				}
				return value;
			});
		} catch {
			return points.map(() => null);
		}
	}

	async function getMetersMany(points: LatLon[]): Promise<(number | null)[]> {
		const result: (number | null)[] = points.map(() => null);
		const valid: { index: number; point: LatLon }[] = [];
		for (let i = 0; i < points.length; i++) {
			const point = points[i];
			if (isValidLatLon(point)) {
				valid.push({ index: i, point });
			}
		}
		for (let start = 0; start < valid.length; start += BATCH_SIZE) {
			const chunk = valid.slice(start, start + BATCH_SIZE);
			const elevations = await fetchChunk(chunk.map((item) => item.point));
			for (let i = 0; i < chunk.length; i++) {
				result[chunk[i].index] = elevations[i] ?? null;
			}
		}
		return result;
	}

	return {
		getMetersMany,
		async getMeters(lat: number, lon: number): Promise<number | null> {
			const [value] = await getMetersMany([{ lat, lon }]);
			return value ?? null;
		},
	};
}

export const elevation = createElevationService();
