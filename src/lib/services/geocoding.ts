import type { Place } from "$lib/types";
import { type FetchFn, getJson } from "./http";

const NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse";
const MIN_INTERVAL_MS = 1100;

type NominatimSearchHit = {
	lat: string;
	lon: string;
	display_name: string;
	boundingbox?: [string, string, string, string];
};

type NominatimReverseHit = {
	lat?: string;
	lon?: string;
	display_name?: string;
	error?: string;
};

export type GeocodingService = {
	search: (query: string) => Promise<Place[]>;
	reverse: (lat: number, lon: number) => Promise<Place | null>;
};

export type GeocodingDeps = {
	getJson?: typeof getJson;
	fetch?: FetchFn;
	now?: () => number;
	sleep?: (ms: number) => Promise<void>;
};

export function createGeocodingService(
	deps: GeocodingDeps = {},
): GeocodingService {
	const requestJson = deps.getJson ?? getJson;
	const fetchFn = deps.fetch;
	const now = deps.now ?? (() => Date.now());
	const sleep =
		deps.sleep ??
		((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
	let lastRequestAt = 0;

	async function throttle(): Promise<void> {
		const elapsed = now() - lastRequestAt;
		if (elapsed < MIN_INTERVAL_MS) {
			await sleep(MIN_INTERVAL_MS - elapsed);
		}
		lastRequestAt = now();
	}

	return {
		async search(query: string): Promise<Place[]> {
			const trimmed = query.trim();
			if (!trimmed) {
				return [];
			}
			await throttle();
			const url = new URL(NOMINATIM_SEARCH);
			url.searchParams.set("q", trimmed);
			url.searchParams.set("format", "jsonv2");
			url.searchParams.set("limit", "5");
			url.searchParams.set("addressdetails", "0");
			const hits = await requestJson<NominatimSearchHit[]>(url.toString(), {
				fetch: fetchFn,
			});
			return hits.map(toPlace);
		},

		async reverse(lat: number, lon: number): Promise<Place | null> {
			await throttle();
			const url = new URL(NOMINATIM_REVERSE);
			url.searchParams.set("lat", String(lat));
			url.searchParams.set("lon", String(lon));
			url.searchParams.set("format", "jsonv2");
			url.searchParams.set("zoom", "10");
			const hit = await requestJson<NominatimReverseHit>(url.toString(), {
				fetch: fetchFn,
			});
			if (!hit.lat || !hit.lon || hit.error) {
				return {
					lat,
					lon,
					label: formatCoordinates(lat, lon),
				};
			}
			return toPlace(hit as NominatimSearchHit);
		},
	};
}

function toPlace(hit: NominatimSearchHit): Place {
	const lat = Number(hit.lat);
	const lon = Number(hit.lon);
	const place: Place = {
		lat,
		lon,
		label: hit.display_name || formatCoordinates(lat, lon),
	};
	if (hit.boundingbox?.length === 4) {
		const [south, north, west, east] = hit.boundingbox.map(Number);
		place.bbox = [west, south, east, north];
	}
	return place;
}

export function formatCoordinates(lat: number, lon: number): string {
	const ns = lat >= 0 ? "N" : "S";
	const ew = lon >= 0 ? "E" : "W";
	return `${Math.abs(lat).toFixed(4)}° ${ns}, ${Math.abs(lon).toFixed(4)}° ${ew}`;
}

export const geocoding = createGeocodingService();
