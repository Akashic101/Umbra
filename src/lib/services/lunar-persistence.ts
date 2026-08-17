import {
	ALL_LUNAR_ECLIPSE_TYPES,
	CATALOG_YEAR_MAX,
	CATALOG_YEAR_MIN,
	DEFAULT_LUNAR_FILTERS,
	type LunarEclipseFilters,
	type LunarEclipseType,
	type ObserverLocation,
	type PersistedLunarState,
} from "$lib/types";

const STORAGE_KEY = "umbra-lunar-v1";

export type LunarPersistenceService = {
	load: () => PersistedLunarState | null;
	save: (state: PersistedLunarState) => void;
};

export type LunarPersistenceDeps = {
	storage?: Storage | null;
};

export function createLunarPersistenceService(
	deps: LunarPersistenceDeps = {},
): LunarPersistenceService {
	const storage = () =>
		deps.storage ?? (typeof localStorage === "undefined" ? null : localStorage);

	return {
		load() {
			const store = storage();
			if (!store) {
				return null;
			}
			try {
				const raw = store.getItem(STORAGE_KEY);
				if (!raw) {
					return null;
				}
				return normalizePersisted(JSON.parse(raw));
			} catch {
				return null;
			}
		},
		save(state) {
			const store = storage();
			if (!store) {
				return;
			}
			try {
				store.setItem(STORAGE_KEY, JSON.stringify(state));
			} catch {
				// Ignore quota / private-mode failures.
			}
		},
	};
}

export type LunarQueryState = PersistedLunarState & {
	location: ObserverLocation | null;
};

export function parseLunarQuery(search: string): Partial<LunarQueryState> {
	const params = new URLSearchParams(
		search.startsWith("?") ? search.slice(1) : search,
	);
	const result: Partial<LunarQueryState> = {};

	const lat = parseNumber(params.get("lat"));
	const lon = parseNumber(params.get("lon"));
	if (lat !== null && lon !== null) {
		result.location = {
			lat,
			lon,
			height: parseNumber(params.get("h")) ?? 0,
			label: params.get("label") ?? "",
		};
	}

	const date = params.get("date");
	if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
		result.selectedDate = date;
	}

	const types = params.get("types");
	const yearFrom = parseNumber(params.get("y0"));
	const yearTo = parseNumber(params.get("y1"));
	const dateFrom = parseIsoDate(params.get("df"));
	const dateTo = parseIsoDate(params.get("dt"));
	const minUmbral = parseNumber(params.get("d"));
	const minMag = parseNumber(params.get("mag"));
	const visible = params.get("visible");

	if (
		types ||
		yearFrom !== null ||
		yearTo !== null ||
		dateFrom ||
		dateTo ||
		minUmbral !== null ||
		minMag !== null ||
		visible !== null
	) {
		result.filters = {
			...DEFAULT_LUNAR_FILTERS,
			types: types
				? types
						.split(",")
						.filter((value): value is LunarEclipseType =>
							ALL_LUNAR_ECLIPSE_TYPES.includes(value as LunarEclipseType),
						)
				: [...DEFAULT_LUNAR_FILTERS.types],
			visibleHere: visible === "1",
			yearFrom: clampYear(yearFrom ?? DEFAULT_LUNAR_FILTERS.yearFrom),
			yearTo: clampYear(yearTo ?? DEFAULT_LUNAR_FILTERS.yearTo),
			dateFrom,
			dateTo,
			minUmbralDurationSeconds: Math.max(0, minUmbral ?? 0),
			minUmbralMagnitude: Math.max(0, minMag ?? 0),
		};
	}

	return result;
}

export function serializeLunarQuery(state: LunarQueryState): string {
	const params = new URLSearchParams();
	if (state.location) {
		params.set("lat", state.location.lat.toFixed(5));
		params.set("lon", state.location.lon.toFixed(5));
		if (state.location.height) {
			params.set("h", String(Math.round(state.location.height)));
		}
		if (state.location.label) {
			params.set("label", state.location.label);
		}
	}
	if (state.selectedDate) {
		params.set("date", state.selectedDate);
	}
	params.set("types", state.filters.types.join(","));
	if (state.filters.visibleHere) {
		params.set("visible", "1");
	}
	params.set("y0", String(state.filters.yearFrom));
	params.set("y1", String(state.filters.yearTo));
	if (state.filters.dateFrom) {
		params.set("df", state.filters.dateFrom);
	}
	if (state.filters.dateTo) {
		params.set("dt", state.filters.dateTo);
	}
	if (state.filters.minUmbralDurationSeconds) {
		params.set("d", String(state.filters.minUmbralDurationSeconds));
	}
	if (state.filters.minUmbralMagnitude > 0) {
		params.set("mag", String(state.filters.minUmbralMagnitude));
	}
	return params.toString();
}

function normalizePersisted(value: unknown): PersistedLunarState | null {
	if (!value || typeof value !== "object") {
		return null;
	}
	const record = value as Partial<PersistedLunarState>;
	return {
		selectedDate:
			typeof record.selectedDate === "string" ? record.selectedDate : null,
		filters: normalizeFilters(record.filters),
	};
}

function normalizeFilters(
	value: LunarEclipseFilters | undefined,
): LunarEclipseFilters {
	if (!value) {
		return {
			...DEFAULT_LUNAR_FILTERS,
			types: [...DEFAULT_LUNAR_FILTERS.types],
		};
	}
	const types = Array.isArray(value.types)
		? value.types.filter((item): item is LunarEclipseType =>
				ALL_LUNAR_ECLIPSE_TYPES.includes(item),
			)
		: [...DEFAULT_LUNAR_FILTERS.types];
	return {
		types: types.length ? types : [...DEFAULT_LUNAR_FILTERS.types],
		visibleHere: Boolean(value.visibleHere),
		yearFrom: clampYear(value.yearFrom ?? CATALOG_YEAR_MIN),
		yearTo: clampYear(value.yearTo ?? CATALOG_YEAR_MAX),
		dateFrom: parseIsoDate(
			typeof value.dateFrom === "string" ? value.dateFrom : null,
		),
		dateTo: parseIsoDate(
			typeof value.dateTo === "string" ? value.dateTo : null,
		),
		minUmbralDurationSeconds: Math.max(0, value.minUmbralDurationSeconds ?? 0),
		minUmbralMagnitude: Math.max(0, value.minUmbralMagnitude ?? 0),
	};
}

function parseNumber(value: string | null): number | null {
	if (value === null || value === "") {
		return null;
	}
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function parseIsoDate(value: string | null): string | null {
	if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return null;
	}
	return value;
}

function clampYear(year: number): number {
	return Math.min(
		CATALOG_YEAR_MAX,
		Math.max(CATALOG_YEAR_MIN, Math.round(year)),
	);
}

export const lunarPersistence = createLunarPersistenceService();
