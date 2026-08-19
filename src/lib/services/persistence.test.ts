import { describe, expect, it, vi } from "vitest";
import { DEFAULT_FILTERS } from "$lib/types";
import {
	createPersistenceService,
	parseQuery,
	persistence,
	serializeQuery,
} from "./persistence";

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
	filters: { ...DEFAULT_FILTERS, types: [...DEFAULT_FILTERS.types] },
};

describe("parseQuery", () => {
	it("parses location and filter params", () => {
		const parsed = parseQuery(
			"?lat=48.137&lon=11.576&h=520&label=Munich&date=2026-08-12&types=total,partial&visible=1&y0=2020&y1=2030&df=2026-01-01&dt=2026-12-31&d=60&cd=30&cov=50",
		);
		expect(parsed.location).toEqual(baseState.location);
		expect(parsed.selectedDate).toBe("2026-08-12");
		expect(parsed.filters?.types).toEqual(["total", "partial"]);
		expect(parsed.filters?.visibleHere).toBe(true);
		expect(parsed.filters?.minObscuration).toBe(0.5);
	});

	it("ignores invalid values", () => {
		expect(parseQuery("?lat=bad&lon=1")).toEqual({});
		expect(parseQuery("?date=not-a-date")).toEqual({});
		expect(parseQuery("lat=48.137&lon=11.576")).toMatchObject({
			location: { lat: 48.137, lon: 11.576, height: 0, label: "" },
		});
		expect(parseQuery("?lat=48.137")).toEqual({});
	});

	it("parses individual filter params and defaults", () => {
		expect(parseQuery("?visible=0").filters?.visibleHere).toBe(false);
		expect(parseQuery("?y0=2020").filters?.yearFrom).toBe(2020);
		expect(parseQuery("?d=30").filters?.minDurationSeconds).toBe(30);
		expect(parseQuery("?cd=15").filters?.minCentralDurationSeconds).toBe(15);
		expect(parseQuery("?df=2026-01-01").filters?.dateFrom).toBe("2026-01-01");
		expect(parseQuery("?types=invalid").filters?.types).toEqual([]);
	});
});

describe("serializeQuery", () => {
	it("skips location params when location is null", () => {
		const query = serializeQuery({
			location: null,
			selectedDate: "2026-08-12",
			filters: baseState.filters,
		});
		expect(query).not.toContain("lat=");
		expect(query).toContain("date=2026-08-12");
	});

	it("omits optional params when unset", () => {
		const query = serializeQuery({
			location: { lat: 48.137, lon: 11.576, height: 0, label: "" },
			selectedDate: null,
			filters: {
				...DEFAULT_FILTERS,
				types: [...DEFAULT_FILTERS.types],
				visibleHere: false,
				dateFrom: null,
				dateTo: null,
				minDurationSeconds: 0,
				minCentralDurationSeconds: 0,
				minObscuration: 0,
			},
		});
		expect(query).toContain("lat=48.13700");
		expect(query).not.toContain("h=");
		expect(query).not.toContain("label=");
		expect(query).not.toContain("visible=1");
		expect(query).not.toContain("df=");
		expect(query).not.toContain("cov=");
	});

	it("includes optional location fields when present", () => {
		const query = serializeQuery({
			...baseState,
			filters: {
				...baseState.filters,
				visibleHere: true,
				dateFrom: "2026-01-01",
				dateTo: "2026-12-31",
				minDurationSeconds: 60,
				minCentralDurationSeconds: 30,
				minObscuration: 0.5,
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
		expect(query).toContain("cd=30");
		expect(query).toContain("cov=50");
	});
	it("round-trips the persisted state", () => {
		const query = serializeQuery({
			...baseState,
			filters: {
				...baseState.filters,
				visibleHere: true,
				yearFrom: 2020,
				yearTo: 2030,
				dateFrom: "2026-01-01",
				dateTo: "2026-12-31",
				minDurationSeconds: 60,
				minCentralDurationSeconds: 30,
				minObscuration: 0.5,
			},
		});
		expect(parseQuery(`?${query}`)).toMatchObject({
			location: baseState.location,
			selectedDate: baseState.selectedDate,
		});
	});
});

describe("createPersistenceService", () => {
	it("round-trips persisted state", () => {
		const service = createPersistenceService({ storage: memoryStorage() });
		service.save(baseState);
		expect(service.load()).toEqual(baseState);
	});

	it("returns null when storage is unavailable or empty", () => {
		expect(createPersistenceService({ storage: null }).load()).toBeNull();
		expect(
			createPersistenceService({ storage: memoryStorage() }).load(),
		).toBeNull();
		const service = createPersistenceService({ storage: null });
		expect(() => service.save(baseState)).not.toThrow();
	});

	it("returns null for invalid JSON or shape", () => {
		const service = createPersistenceService({
			storage: memoryStorage({
				"umbra-state-v1": "not-json",
			}),
		});
		expect(service.load()).toBeNull();
		service.save(baseState);
		const broken = createPersistenceService({
			storage: memoryStorage({
				"umbra-state-v1": JSON.stringify("bad"),
			}),
		});
		expect(broken.load()).toBeNull();
	});

	it("normalizes partial persisted data", () => {
		const service = createPersistenceService({
			storage: memoryStorage({
				"umbra-state-v1": JSON.stringify({
					location: { lat: 48.137, lon: 11.576 },
					selectedDate: "2026-08-12",
					filters: {
						types: ["total", "invalid"],
						visibleHere: true,
						yearFrom: 1800,
						yearTo: 2200,
						dateFrom: "bad",
						minObscuration: 2,
					},
				}),
			}),
		});
		const loaded = service.load();
		expect(loaded?.location).toEqual({
			lat: 48.137,
			lon: 11.576,
			height: 0,
			label: "",
		});
		expect(loaded?.filters.types).toEqual(["total"]);
		expect(loaded?.filters.yearFrom).toBeGreaterThanOrEqual(1900);
		expect(loaded?.filters.minObscuration).toBe(1);

		const missingFilters = createPersistenceService({
			storage: memoryStorage({
				"umbra-state-v1": JSON.stringify({
					selectedDate: "2026-08-12",
					location: null,
				}),
			}),
		});
		expect(missingFilters.load()?.filters.types).toEqual(DEFAULT_FILTERS.types);

		const invalidLocation = createPersistenceService({
			storage: memoryStorage({
				"umbra-state-v1": JSON.stringify({
					location: { lat: "bad", lon: 11.576 },
					selectedDate: "2026-08-12",
				}),
			}),
		});
		expect(invalidLocation.load()?.location).toBeNull();

		const invalidObscuration = createPersistenceService({
			storage: memoryStorage({
				"umbra-state-v1": JSON.stringify({
					selectedDate: "2026-08-12",
					filters: { minObscuration: "bad" },
				}),
			}),
		});
		expect(invalidObscuration.load()?.filters.minObscuration).toBe(0);

		const invalidTypes = createPersistenceService({
			storage: memoryStorage({
				"umbra-state-v1": JSON.stringify({
					selectedDate: "2026-08-12",
					filters: { types: ["invalid-only"] },
				}),
			}),
		});
		expect(invalidTypes.load()?.filters.types).toEqual(DEFAULT_FILTERS.types);

		const nonStringDate = createPersistenceService({
			storage: memoryStorage({
				"umbra-state-v1": JSON.stringify({
					selectedDate: 20260812,
				}),
			}),
		});
		expect(nonStringDate.load()?.selectedDate).toBeNull();

		const nonArrayTypes = createPersistenceService({
			storage: memoryStorage({
				"umbra-state-v1": JSON.stringify({
					selectedDate: "2026-08-12",
					filters: { types: "total", dateFrom: 123, dateTo: 456 },
				}),
			}),
		});
		expect(nonArrayTypes.load()?.filters.types).toEqual(DEFAULT_FILTERS.types);
		expect(nonArrayTypes.load()?.filters.dateFrom).toBeNull();
		expect(nonArrayTypes.load()?.filters.dateTo).toBeNull();

		const datedFilters = createPersistenceService({
			storage: memoryStorage({
				"umbra-state-v1": JSON.stringify({
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
		const service = createPersistenceService({
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
		expect(() => service.save(baseState)).not.toThrow();
	});

	it("uses browser storage when no deps are provided", () => {
		const store = memoryStorage();
		vi.stubGlobal("localStorage", store);
		const service = createPersistenceService();
		service.save(baseState);
		expect(service.load()).toEqual(baseState);
		vi.unstubAllGlobals();
	});
});

describe("persistence export", () => {
	it("loads from the default service without throwing", () => {
		expect(persistence.load()).toSatisfy(
			(value: unknown) => value === null || typeof value === "object",
		);
	});
});
