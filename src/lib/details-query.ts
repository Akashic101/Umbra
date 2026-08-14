import { formatCoordinates } from "$lib/services/geocoding";
import type { ObserverLocation } from "$lib/types";

export type DetailsQuery = {
	date: string;
	location: ObserverLocation;
};

export function parseDetailsQuery(search: string): DetailsQuery | null {
	const params = new URLSearchParams(
		search.startsWith("?") ? search.slice(1) : search,
	);
	const date = params.get("date");
	const lat = Number(params.get("lat"));
	const lon = Number(params.get("lon"));
	if (
		!date ||
		!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
		!Number.isFinite(lat) ||
		!Number.isFinite(lon)
	) {
		return null;
	}
	const height = Number(params.get("h"));
	return {
		date,
		location: {
			lat,
			lon,
			height: Number.isFinite(height) ? height : 0,
			label: params.get("label") ?? formatCoordinates(lat, lon),
		},
	};
}

export function serializeDetailsQuery(query: DetailsQuery): string {
	const params = new URLSearchParams();
	params.set("date", query.date);
	params.set("lat", query.location.lat.toFixed(5));
	params.set("lon", query.location.lon.toFixed(5));
	if (query.location.height) {
		params.set("h", String(Math.round(query.location.height)));
	}
	if (query.location.label) {
		params.set("label", query.location.label);
	}
	return params.toString();
}

export function deviceTimeZone(): string {
	return typeof Intl === "undefined"
		? "UTC"
		: Intl.DateTimeFormat().resolvedOptions().timeZone;
}
