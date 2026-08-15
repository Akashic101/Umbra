import { type FetchFn, getJson } from "./http";

const ELEVATION_URL = "https://api.open-meteo.com/v1/elevation";

export type ElevationService = {
	/** Terrain elevation in meters (WGS84 / DEM). Null if unavailable. */
	getMeters: (lat: number, lon: number) => Promise<number | null>;
};

export type ElevationDeps = {
	getJson?: typeof getJson;
	fetch?: FetchFn;
};

type ElevationResponse = {
	elevation?: Array<number | null>;
};

/**
 * Open-Meteo Elevation API (Copernicus GLO-90 DEM, ~90 m).
 * Free for non-commercial use; CORS-enabled; no API key.
 */
export function createElevationService(
	deps: ElevationDeps = {},
): ElevationService {
	const requestJson = deps.getJson ?? getJson;
	const fetchFn = deps.fetch;

	return {
		async getMeters(lat: number, lon: number): Promise<number | null> {
			if (
				!Number.isFinite(lat) ||
				!Number.isFinite(lon) ||
				Math.abs(lat) > 90 ||
				Math.abs(lon) > 180
			) {
				return null;
			}
			const url = new URL(ELEVATION_URL);
			url.searchParams.set("latitude", String(lat));
			url.searchParams.set("longitude", String(lon));
			try {
				const data = await requestJson<ElevationResponse>(url.toString(), {
					fetch: fetchFn,
					timeoutMs: 8_000,
				});
				const value = data.elevation?.[0];
				if (typeof value !== "number" || !Number.isFinite(value)) {
					return null;
				}
				return value;
			} catch {
				return null;
			}
		},
	};
}

export const elevation = createElevationService();
