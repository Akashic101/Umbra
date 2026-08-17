import type { ObserverLocation } from "$lib/types";

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
