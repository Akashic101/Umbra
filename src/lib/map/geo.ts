import type { LatLon } from "$lib/types";

export function toLeafletRing(path: LatLon[]): [number, number][] {
	if (!path.length) {
		return [];
	}
	const ring: [number, number][] = [];
	let offset = 0;
	let previous = path[0].lon;
	for (const point of path) {
		let lon = point.lon + offset;
		const delta = lon - previous;
		if (delta > 180) {
			offset -= 360;
			lon = point.lon + offset;
		} else if (delta < -180) {
			offset += 360;
			lon = point.lon + offset;
		}
		ring.push([point.lat, lon]);
		previous = lon;
	}
	return ring;
}
