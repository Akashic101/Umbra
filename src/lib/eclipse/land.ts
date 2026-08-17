import type { LatLon } from "$lib/types";
import { destination, downsampleLatLons, haversineKm } from "./geo";

const PATH_SAMPLE_COUNT = 80;
const SPIRAL_RADII_KM = [50, 100, 200, 400, 800];
const SPIRAL_BEARINGS = 12;

export type LandLookup = {
	getElevations: (points: LatLon[]) => Promise<(number | null)[]>;
};

/**
 * Copernicus GLO-90 (Open-Meteo) returns 0 over ocean and a non-zero DEM
 * height over terrain, including land below sea level.
 */
export function elevationLooksLikeLand(meters: number | null): boolean {
	return typeof meters === "number" && Number.isFinite(meters) && meters !== 0;
}

export function closestLandPoint(
	origin: LatLon,
	candidates: LatLon[],
	elevations: (number | null)[],
): LatLon | null {
	let best: LatLon | null = null;
	let bestKm = Number.POSITIVE_INFINITY;
	const count = Math.min(candidates.length, elevations.length);
	for (let i = 0; i < count; i++) {
		if (!elevationLooksLikeLand(elevations[i] ?? null)) {
			continue;
		}
		const km = haversineKm(origin, candidates[i]);
		if (km < bestKm) {
			bestKm = km;
			best = candidates[i];
		}
	}
	return best;
}

export function spiralSearchPoints(origin: LatLon): LatLon[] {
	const points: LatLon[] = [];
	for (const radiusKm of SPIRAL_RADII_KM) {
		for (let i = 0; i < SPIRAL_BEARINGS; i++) {
			points.push(destination(origin, radiusKm, (i * 360) / SPIRAL_BEARINGS));
		}
	}
	return points;
}

/**
 * Prefer the origin when it is already on land; otherwise the nearest land
 * sample on `path` (typically the eclipse centerline); then a spiral around
 * the origin. Returns the origin if no land is found.
 */
export async function nearestLandLocation(
	origin: LatLon,
	path: LatLon[],
	lookup: LandLookup,
): Promise<{ point: LatLon; onLand: boolean }> {
	const originElevation = (await lookup.getElevations([origin]))[0] ?? null;
	if (elevationLooksLikeLand(originElevation)) {
		return { point: origin, onLand: true };
	}

	const pathSamples = downsampleLatLons(path, PATH_SAMPLE_COUNT);
	if (pathSamples.length > 0) {
		const pathHit = closestLandPoint(
			origin,
			pathSamples,
			await lookup.getElevations(pathSamples),
		);
		if (pathHit) {
			return { point: pathHit, onLand: true };
		}
	}

	const spiral = spiralSearchPoints(origin);
	const spiralHit = closestLandPoint(
		origin,
		spiral,
		await lookup.getElevations(spiral),
	);
	if (spiralHit) {
		return { point: spiralHit, onLand: true };
	}

	return { point: origin, onLand: false };
}
