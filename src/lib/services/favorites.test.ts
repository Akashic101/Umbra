import { describe, expect, it, vi } from "vitest";
import {
	createFavoritesService,
	favoriteDetailsHref,
	favoriteId,
	favoritesService,
} from "./favorites";

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

const berlin = {
	lat: 52.52,
	lon: 13.405,
	height: 34,
	label: "Berlin",
};

describe("favoriteId", () => {
	it("builds a stable id from date and location", () => {
		expect(favoriteId("2026-08-12", berlin)).toBe(
			"2026-08-12|52.52000|13.40500|34",
		);
	});

	it("prefixes lunar ids", () => {
		expect(favoriteId("2026-08-12", berlin, "lunar")).toBe(
			"lunar|2026-08-12|52.52000|13.40500|34",
		);
	});
});

describe("favoriteDetailsHref", () => {
	it("links solar favorites to solar details", () => {
		expect(
			favoriteDetailsHref({
				id: "x",
				kind: "solar",
				date: "2026-08-12",
				location: berlin,
				savedAt: "2026-01-01T00:00:00.000Z",
			}),
		).toBe(
			"/details?date=2026-08-12&lat=52.52000&lon=13.40500&h=34&label=Berlin",
		);
	});

	it("links lunar favorites to lunar details", () => {
		expect(
			favoriteDetailsHref({
				id: "x",
				kind: "lunar",
				date: "2025-09-07",
				location: berlin,
				savedAt: "2026-01-01T00:00:00.000Z",
			}),
		).toBe(
			"/lunar/details?date=2025-09-07&lat=52.52000&lon=13.40500&h=34&label=Berlin",
		);
	});
});

describe("createFavoritesService", () => {
	it("round-trips favorites", () => {
		const service = createFavoritesService({ storage: memoryStorage() });
		const favorites = [
			{
				id: "f1",
				kind: "solar" as const,
				date: "2026-08-12",
				location: berlin,
				savedAt: "2026-01-01T00:00:00.000Z",
			},
		];
		service.save(favorites);
		expect(service.load()).toEqual(favorites);
	});

	it("returns an empty list when storage is missing", () => {
		expect(createFavoritesService({ storage: null }).load()).toEqual([]);
		createFavoritesService({ storage: null }).save([]);
	});

	it("returns an empty list for invalid JSON", () => {
		const service = createFavoritesService({
			storage: memoryStorage({ "umbra-favorites-v1": "not-json" }),
		});
		expect(service.load()).toEqual([]);
	});

	it("returns an empty list for empty storage values", () => {
		const service = createFavoritesService({
			storage: memoryStorage({ "umbra-favorites-v1": "" }),
		});
		expect(service.load()).toEqual([]);
	});

	it("returns an empty list for non-array persisted data", () => {
		const service = createFavoritesService({
			storage: memoryStorage({
				"umbra-favorites-v1": JSON.stringify({ not: "an-array" }),
			}),
		});
		expect(service.load()).toEqual([]);
	});

	it("normalizes partial records and generates ids", () => {
		const service = createFavoritesService({
			storage: memoryStorage({
				"umbra-favorites-v1": JSON.stringify([
					{
						date: "2026-08-12",
						location: { lat: 52.52, lon: 13.405 },
					},
					{
						kind: "lunar",
						date: "2025-09-07",
						location: berlin,
					},
					{ date: "bad-date", location: berlin },
					"invalid",
					{ date: "2026-08-12", location: { lat: Number.NaN, lon: 1 } },
				]),
			}),
		});
		const loaded = service.load();
		expect(loaded).toHaveLength(2);
		expect(loaded[0]?.id).toBe(
			favoriteId("2026-08-12", {
				lat: 52.52,
				lon: 13.405,
				height: 0,
				label: "",
			}),
		);
		expect(loaded[0]?.kind).toBe("solar");
		expect(loaded[1]?.kind).toBe("lunar");
		expect(loaded[0]?.location.label).toBe("");
		expect(loaded[0]?.savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});

	it("ignores quota failures on save", () => {
		const service = createFavoritesService({
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
		expect(() => service.save([])).not.toThrow();
	});

	it("uses browser storage when no deps are provided", () => {
		const store = memoryStorage();
		vi.stubGlobal("localStorage", store);
		const service = createFavoritesService();
		const favorites = [
			{
				id: "f1",
				kind: "solar" as const,
				date: "2026-08-12",
				location: berlin,
				savedAt: "2026-01-01T00:00:00.000Z",
			},
		];
		service.save(favorites);
		expect(service.load()).toEqual(favorites);
		vi.unstubAllGlobals();
	});

	it("keeps explicit ids and savedAt values", () => {
		const service = createFavoritesService({ storage: memoryStorage() });
		service.save([
			{
				id: "custom-id",
				kind: "lunar",
				date: "2026-08-12",
				location: berlin,
				savedAt: "2025-01-01T00:00:00.000Z",
			},
		]);
		expect(service.load()[0]?.id).toBe("custom-id");
		expect(service.load()[0]?.savedAt).toBe("2025-01-01T00:00:00.000Z");
		expect(service.load()[0]?.kind).toBe("lunar");
	});
});

describe("favoritesService export", () => {
	it("loads from the default service without throwing", () => {
		expect(Array.isArray(favoritesService.load())).toBe(true);
	});
});
