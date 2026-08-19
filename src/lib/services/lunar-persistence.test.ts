import { describe, expect, it, vi } from "vitest";
import { DEFAULT_LUNAR_FILTERS } from "$lib/types";
import {
	createLunarPersistenceService,
	lunarPersistence,
	parseLunarQuery,
	serializeLunarQuery,
} from "./lunar-persistence";

function memoryStorage(initial: Record<string, string> = {}): Storage {
	const data = { ...initial };
	return {
		get length() {
			return Object.keys(data).length;
		},
		clear() {
			for (const key of Object.keys(data)) {
				delete data[key];
			}
		},
		getItem(key: string) {
			return Object.hasOwn(data, key) ? data[key] : null;
		},
		key(index: number) {
			return Object.keys(data)[index] ?? null;
		},
		removeItem(key: string) {
			delete data[key];
		},
		setItem(key: string, value: string) {
			data[key] = value;
		},
	};
}

const baseState = {
	location: { lat: 48.137, lon: 11.576, height: 520, label: "Munich" },
	selectedDate: "2026-08-12",
	filters: { ...DEFAULT_LUNAR_FILTERS, types: [...DEFAULT_LUNAR_FILTERS.types] },
};

describe("parseLunarQuery", () => {
	it("parses location and filter params", () => {
		const parsed = parseLunarQuery(
			"?lat=48.137&lon=11.576&h=520&label=Munich&date=2026-08-12&types=total,partial&visible=1&y0=2020&y1=2030&df=2026-01-01&dt=2026-12-31&d=60&mag=0.8",
		);
		expect(parsed.location).toEqual(baseState.location);
		expect(parsed.selectedDate).toBe("2026-08-12");
		expect(parsed.filters?.types).toEqual(["total", "partial"]);
		expect(parsed.filters?.visibleHere).toBe(true);
		expect(parsed.filters?.minUmbralMagnitude).toBe(0.8);
	});

	it("ignores invalid values", () => {
		expect(parseLunarQuery("?lat=bad&lon=1")).toEqual({});
		expect(parseLunarQuery("lat=48.137&lon=11.576")).toMatchObject({
			location: { lat: 48.137, lon: 11.576, height: 0, label: "" },
		});
		expect(parseLunarQuery("?date=not-a-date")).toEqual({});
	});

	it("parses individual filter params and defaults", () => {
		expect(parseLunarQuery("?visible=0").filters?.visibleHere).toBe(false);
		expect(parseLunarQuery("?y1=2030").filters?.yearTo).toBe(2030);
		expect(parseLunarQuery("?d=45").filters?.minUmbralDurationSeconds).toBe(45);
		expect(parseLunarQuery("?dt=2026-12-31").filters?.dateTo).toBe("2026-12-31");
		expect(parseLunarQuery("?types=invalid").filters?.types).toEqual([]);
	});
});

describe("serializeLunarQuery", () => {
	it("skips location params when location is null", () => {
		const query = serializeLunarQuery({
			location: null,
			selectedDate: "2026-08-12",
			filters: baseState.filters,
		});
		expect(query).not.toContain("lat=");
		expect(query).toContain("date=2026-08-12");
	});

	it("omits optional params when unset", () => {
		const query = serializeLunarQuery({
			location: { lat: 48.137, lon: 11.576, height: 0, label: "" },
			selectedDate: null,
			filters: {
				...DEFAULT_LUNAR_FILTERS,
				types: [...DEFAULT_LUNAR_FILTERS.types],
				visibleHere: false,
				dateFrom: null,
				dateTo: null,
				minUmbralDurationSeconds: 0,
				minUmbralMagnitude: 0,
			},
		});
		expect(query).toContain("lat=48.13700");
		expect(query).not.toContain("h=");
		expect(query).not.toContain("label=");
		expect(query).not.toContain("visible=1");
		expect(query).not.toContain("df=");
		expect(query).not.toContain("mag=");
	});

	it("includes optional location fields when present", () => {
		const query = serializeLunarQuery({
			...baseState,
			selectedDate: "2026-08-12",
			filters: {
				...baseState.filters,
				visibleHere: true,
				dateFrom: "2026-01-01",
				dateTo: "2026-12-31",
				minUmbralDurationSeconds: 60,
				minUmbralMagnitude: 0.8,
			},
		});
		expect(query).toContain("h=520");
		expect(query).toContain(
			`label=${encodeURIComponent("Munich")}`,
		);
		expect(query).toContain("date=2026-08-12");
		expect(query).toContain("visible=1");
		expect(query).toContain("df=2026-01-01");
		expect(query).toContain("dt=2026-12-31");
		expect(query).toContain("d=60");
		expect(query).toContain("mag=0.8");
	});

	it("round-trips the persisted state", () => {
		const query = serializeLunarQuery({
			...baseState,
			filters: {
				...baseState.filters,
				visibleHere: true,
				yearFrom: 2020,
				yearTo: 2030,
				dateFrom: "2026-01-01",
				dateTo: "2026-12-31",
				minUmbralDurationSeconds: 60,
				minUmbralMagnitude: 0.8,
			},
		});
		expect(parseLunarQuery(`?${query}`)).toMatchObject({
			selectedDate: baseState.selectedDate,
		});
	});
});

describe("createLunarPersistenceService", () => {
	it("round-trips persisted state", () => {
		const service = createLunarPersistenceService({
			storage: memoryStorage(),
		});
		service.save({
			selectedDate: "2026-08-12",
			filters: baseState.filters,
		});
		expect(service.load()).toEqual({
			selectedDate: "2026-08-12",
			filters: baseState.filters,
		});
	});

	it("returns null when storage is unavailable or empty", () => {
		expect(createLunarPersistenceService({ storage: null }).load()).toBeNull();
		expect(
			createLunarPersistenceService({ storage: memoryStorage() }).load(),
		).toBeNull();
		const service = createLunarPersistenceService({ storage: null });
		expect(() =>
			service.save({
				selectedDate: "2026-08-12",
				filters: baseState.filters,
			}),
		).not.toThrow();
	});

	it("returns null for invalid JSON or shape", () => {
		const service = createLunarPersistenceService({
			storage: memoryStorage({
				"umbra-lunar-v1": "not-json",
			}),
		});
		expect(service.load()).toBeNull();
		const broken = createLunarPersistenceService({
			storage: memoryStorage({
				"umbra-lunar-v1": JSON.stringify("bad"),
			}),
		});
		expect(broken.load()).toBeNull();
	});

	it("normalizes partial persisted data", () => {
		const service = createLunarPersistenceService({
			storage: memoryStorage({
				"umbra-lunar-v1": JSON.stringify({
					selectedDate: "2026-08-12",
					filters: {
						types: ["total", "invalid"],
						visibleHere: true,
						yearFrom: 1800,
						yearTo: 2200,
						dateFrom: "bad",
						minUmbralMagnitude: -1,
					},
				}),
			}),
		});
		const loaded = service.load();
		expect(loaded?.filters.types).toEqual(["total"]);
		expect(loaded?.filters.yearFrom).toBeGreaterThanOrEqual(1900);
		expect(loaded?.filters.minUmbralMagnitude).toBe(0);

		const missingFilters = createLunarPersistenceService({
			storage: memoryStorage({
				"umbra-lunar-v1": JSON.stringify({
					selectedDate: "2026-08-12",
				}),
			}),
		});
		expect(missingFilters.load()?.filters.types).toEqual(
			DEFAULT_LUNAR_FILTERS.types,
		);

		const invalidTypes = createLunarPersistenceService({
			storage: memoryStorage({
				"umbra-lunar-v1": JSON.stringify({
					selectedDate: "2026-08-12",
					filters: { types: ["invalid-only"], dateFrom: 123, dateTo: 456 },
				}),
			}),
		});
		expect(invalidTypes.load()?.filters.types).toEqual(
			DEFAULT_LUNAR_FILTERS.types,
		);
		expect(invalidTypes.load()?.filters.dateFrom).toBeNull();
		expect(invalidTypes.load()?.filters.dateTo).toBeNull();

		const nonStringDate = createLunarPersistenceService({
			storage: memoryStorage({
				"umbra-lunar-v1": JSON.stringify({
					selectedDate: 20260812,
				}),
			}),
		});
		expect(nonStringDate.load()?.selectedDate).toBeNull();

		const nonArrayTypes = createLunarPersistenceService({
			storage: memoryStorage({
				"umbra-lunar-v1": JSON.stringify({
					selectedDate: "2026-08-12",
					filters: { types: "total", dateFrom: 123, dateTo: 456 },
				}),
			}),
		});
		expect(nonArrayTypes.load()?.filters.types).toEqual(
			DEFAULT_LUNAR_FILTERS.types,
		);
		expect(nonArrayTypes.load()?.filters.dateFrom).toBeNull();
		expect(nonArrayTypes.load()?.filters.dateTo).toBeNull();

		const datedFilters = createLunarPersistenceService({
			storage: memoryStorage({
				"umbra-lunar-v1": JSON.stringify({
					selectedDate: "2026-08-12",
					filters: {
						dateFrom: "2026-01-01",
						dateTo: "2026-12-31",
					},
				}),
			}),
		});
		expect(datedFilters.load()?.filters.dateFrom).toBe("2026-01-01");
		expect(datedFilters.load()?.filters.dateTo).toBe("2026-12-31");
	});

	it("ignores quota failures on save", () => {
		const service = createLunarPersistenceService({
			storage: {
				getItem: () => null,
				setItem: () => {
					throw new Error("quota");
				},
				removeItem: () => {},
				clear: () => {},
				key: () => null,
				get length() {
					return 0;
				},
			},
		});
		expect(() =>
			service.save({
				selectedDate: "2026-08-12",
				filters: baseState.filters,
			}),
		).not.toThrow();
	});

	it("uses browser storage when no deps are provided", () => {
		const store = memoryStorage();
		vi.stubGlobal("localStorage", store);
		const service = createLunarPersistenceService();
		service.save({
			selectedDate: "2026-08-12",
			filters: baseState.filters,
		});
		expect(service.load()?.selectedDate).toBe("2026-08-12");
		vi.unstubAllGlobals();
	});
});

describe("lunarPersistence export", () => {
	it("loads from the default service without throwing", () => {
		expect(lunarPersistence.load()).toSatisfy(
			(value: unknown) => value === null || typeof value === "object",
		);
	});
});
