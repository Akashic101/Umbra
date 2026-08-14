import {
	ALL_ECLIPSE_TYPES,
	CATALOG_YEAR_MAX,
	CATALOG_YEAR_MIN,
	DEFAULT_FILTERS,
	type EclipseFilters,
	type EclipseType,
	type ObserverLocation,
	type PersistedAppState,
} from "$lib/types";

const STORAGE_KEY = "umbra-state-v1";

export type PersistenceService = {
	load: () => PersistedAppState | null;
	save: (state: PersistedAppState) => void;
};

export type PersistenceDeps = {
	storage?: Storage | null;
};

export function createPersistenceService(
	deps: PersistenceDeps = {},
): PersistenceService {
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

export function parseQuery(search: string): Partial<PersistedAppState> {
	const params = new URLSearchParams(
		search.startsWith("?") ? search.slice(1) : search,
	);
	const result: Partial<PersistedAppState> = {};

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
	const minDuration = parseNumber(params.get("d"));
	const minCentral = parseNumber(params.get("cd"));
	const minCoveragePct = parseNumber(params.get("cov"));
	const visible = params.get("visible");

	if (
		types ||
		yearFrom !== null ||
		yearTo !== null ||
		dateFrom ||
		dateTo ||
		minDuration !== null ||
		minCentral !== null ||
		minCoveragePct !== null ||
		visible !== null
	) {
		result.filters = {
			...DEFAULT_FILTERS,
			types: types
				? types
						.split(",")
						.filter((value): value is EclipseType =>
							ALL_ECLIPSE_TYPES.includes(value as EclipseType),
						)
				: [...DEFAULT_FILTERS.types],
			visibleHere: visible === "1",
			yearFrom: clampYear(yearFrom ?? DEFAULT_FILTERS.yearFrom),
			yearTo: clampYear(yearTo ?? DEFAULT_FILTERS.yearTo),
			dateFrom,
			dateTo,
			minDurationSeconds: Math.max(0, minDuration ?? 0),
			minCentralDurationSeconds: Math.max(0, minCentral ?? 0),
			minObscuration: clampObscuration(
				minCoveragePct !== null ? minCoveragePct / 100 : 0,
			),
		};
	}

	return result;
}

export function serializeQuery(state: PersistedAppState): string {
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
	if (state.filters.minDurationSeconds) {
		params.set("d", String(state.filters.minDurationSeconds));
	}
	if (state.filters.minCentralDurationSeconds) {
		params.set("cd", String(state.filters.minCentralDurationSeconds));
	}
	if (state.filters.minObscuration > 0) {
		params.set("cov", String(Math.round(state.filters.minObscuration * 100)));
	}
	return params.toString();
}

function normalizePersisted(value: unknown): PersistedAppState | null {
	if (!value || typeof value !== "object") {
		return null;
	}
	const record = value as Partial<PersistedAppState>;
	return {
		location: normalizeLocation(record.location),
		selectedDate:
			typeof record.selectedDate === "string" ? record.selectedDate : null,
		filters: normalizeFilters(record.filters),
	};
}

function normalizeLocation(
	value: ObserverLocation | null | undefined,
): ObserverLocation | null {
	if (
		!value ||
		typeof value.lat !== "number" ||
		typeof value.lon !== "number"
	) {
		return null;
	}
	return {
		lat: value.lat,
		lon: value.lon,
		height: typeof value.height === "number" ? value.height : 0,
		label: typeof value.label === "string" ? value.label : "",
	};
}

function normalizeFilters(value: EclipseFilters | undefined): EclipseFilters {
	if (!value) {
		return { ...DEFAULT_FILTERS, types: [...DEFAULT_FILTERS.types] };
	}
	const types = Array.isArray(value.types)
		? value.types.filter((item): item is EclipseType =>
				ALL_ECLIPSE_TYPES.includes(item),
			)
		: [...DEFAULT_FILTERS.types];
	return {
		types: types.length ? types : [...DEFAULT_FILTERS.types],
		visibleHere: Boolean(value.visibleHere),
		yearFrom: clampYear(value.yearFrom ?? CATALOG_YEAR_MIN),
		yearTo: clampYear(value.yearTo ?? CATALOG_YEAR_MAX),
		dateFrom: parseIsoDate(
			typeof value.dateFrom === "string" ? value.dateFrom : null,
		),
		dateTo: parseIsoDate(
			typeof value.dateTo === "string" ? value.dateTo : null,
		),
		minDurationSeconds: Math.max(0, value.minDurationSeconds ?? 0),
		minCentralDurationSeconds: Math.max(
			0,
			value.minCentralDurationSeconds ?? 0,
		),
		minObscuration: clampObscuration(value.minObscuration ?? 0),
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

function clampObscuration(value: number): number {
	if (!Number.isFinite(value)) {
		return 0;
	}
	return Math.min(1, Math.max(0, value));
}

export const persistence = createPersistenceService();
