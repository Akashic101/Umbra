import type { AppEclipseKind, ObserverLocation } from "$lib/types";

const STORAGE_KEY = "umbra-compare-locations-v1";
const MAX_EXTRAS = 2;

export type CompareLocationsService = {
	load: (
		kind: AppEclipseKind,
		date: string,
		primary: Pick<ObserverLocation, "lat" | "lon">,
	) => ObserverLocation[];
	save: (
		kind: AppEclipseKind,
		date: string,
		primary: Pick<ObserverLocation, "lat" | "lon">,
		locations: ObserverLocation[],
	) => void;
};

export type CompareLocationsDeps = {
	storage?: Storage | null;
};

export function compareStorageKey(
	kind: AppEclipseKind,
	date: string,
	primary: Pick<ObserverLocation, "lat" | "lon">,
): string {
	return `${kind}:${date}:${primary.lat.toFixed(5)}:${primary.lon.toFixed(5)}`;
}

export function createCompareLocationsService(
	deps: CompareLocationsDeps = {},
): CompareLocationsService {
	const storage = () =>
		deps.storage ?? (typeof localStorage === "undefined" ? null : localStorage);

	function readAll(): Record<string, ObserverLocation[]> {
		const store = storage();
		if (!store) {
			return {};
		}
		try {
			const raw = store.getItem(STORAGE_KEY);
			if (!raw) {
				return {};
			}
			return normalizeStore(JSON.parse(raw));
		} catch {
			return {};
		}
	}

	function writeAll(value: Record<string, ObserverLocation[]>): void {
		const store = storage();
		if (!store) {
			return;
		}
		try {
			store.setItem(STORAGE_KEY, JSON.stringify(value));
		} catch {
			// Ignore quota / private-mode failures.
		}
	}

	return {
		load(kind, date, primary) {
			const key = compareStorageKey(kind, date, primary);
			return readAll()[key] ?? [];
		},
		save(kind, date, primary, locations) {
			const key = compareStorageKey(kind, date, primary);
			const next = { ...readAll() };
			const cleaned = locations
				.map(cloneLocation)
				.filter((location): location is ObserverLocation => location !== null)
				.slice(0, MAX_EXTRAS);
			if (cleaned.length === 0) {
				delete next[key];
			} else {
				next[key] = cleaned;
			}
			writeAll(next);
		},
	};
}

function normalizeStore(value: unknown): Record<string, ObserverLocation[]> {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return {};
	}
	const out: Record<string, ObserverLocation[]> = {};
	for (const [key, item] of Object.entries(value)) {
		if (typeof key !== "string" || !key || !Array.isArray(item)) {
			continue;
		}
		const locations = item
			.map(cloneLocation)
			.filter((location): location is ObserverLocation => location !== null)
			.slice(0, MAX_EXTRAS);
		if (locations.length) {
			out[key] = locations;
		}
	}
	return out;
}

function cloneLocation(value: unknown): ObserverLocation | null {
	if (!value || typeof value !== "object") {
		return null;
	}
	const record = value as Partial<ObserverLocation>;
	if (typeof record.lat !== "number" || typeof record.lon !== "number") {
		return null;
	}
	if (!Number.isFinite(record.lat) || !Number.isFinite(record.lon)) {
		return null;
	}
	return {
		lat: record.lat,
		lon: record.lon,
		height: typeof record.height === "number" ? record.height : 0,
		label: typeof record.label === "string" ? record.label : "",
	};
}

export const compareLocationsService = createCompareLocationsService();
