import type { LatLon, ObserverLocation } from "$lib/types";

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in kilometres. */
export function haversineKm(
	a: Pick<ObserverLocation, "lat" | "lon">,
	b: Pick<ObserverLocation, "lat" | "lon">,
): number {
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const dLat = toRad(b.lat - a.lat);
	const dLon = toRad(b.lon - a.lon);
	const lat1 = toRad(a.lat);
	const lat2 = toRad(b.lat);
	const h =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
	return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function samePlace(
	a: Pick<ObserverLocation, "lat" | "lon">,
	b: Pick<ObserverLocation, "lat" | "lon">,
	epsilonDeg = 0.0005,
): boolean {
	return (
		Math.abs(a.lat - b.lat) < epsilonDeg && Math.abs(a.lon - b.lon) < epsilonDeg
	);
}

/** Destination point after travelling `distanceKm` along `bearingDeg` (0 = north). */
export function destination(
	origin: Pick<ObserverLocation, "lat" | "lon">,
	distanceKm: number,
	bearingDeg: number,
): LatLon {
	const angular = distanceKm / EARTH_RADIUS_KM;
	const bearing = (bearingDeg * Math.PI) / 180;
	const lat1 = (origin.lat * Math.PI) / 180;
	const lon1 = (origin.lon * Math.PI) / 180;
	const sinLat2 =
		Math.sin(lat1) * Math.cos(angular) +
		Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing);
	const lat2 = Math.asin(Math.min(1, Math.max(-1, sinLat2)));
	const y = Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1);
	const x = Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2);
	const lon2 = lon1 + Math.atan2(y, x);
	return {
		lat: (lat2 * 180) / Math.PI,
		lon: (((lon2 * 180) / Math.PI + 540) % 360) - 180,
	};
}

/** Evenly sample a polyline down to at most `maxCount` vertices. */
export function downsampleLatLons(
	points: LatLon[],
	maxCount: number,
): LatLon[] {
	if (maxCount <= 0 || points.length === 0) {
		return [];
	}
	if (points.length <= maxCount) {
		return [...points];
	}
	if (maxCount === 1) {
		return [points[0]];
	}
	const sampled: LatLon[] = [];
	const last = points.length - 1;
	for (let i = 0; i < maxCount; i++) {
		const index = Math.round((i * last) / (maxCount - 1));
		sampled.push(points[index]);
	}
	return sampled;
}
