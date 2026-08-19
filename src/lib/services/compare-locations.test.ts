import { describe, expect, it, vi } from "vitest";
import {
	compareStorageKey,
	createCompareLocationsService,
} from "./compare-locations";

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
const paris = {
	lat: 48.8566,
	lon: 2.3522,
	height: 35,
	label: "Paris",
};
const munich = { lat: 48.137, lon: 11.576 };

describe("compareLocationsService", () => {
	it("round-trips extras for one eclipse and observer", () => {
		const service = createCompareLocationsService({
			storage: memoryStorage(),
		});
		service.save("solar", "2026-08-12", munich, [berlin, paris]);
		expect(service.load("solar", "2026-08-12", munich)).toEqual([
			berlin,
			paris,
		]);
	});

	it("keeps solar and lunar extras for the same date separate", () => {
		const service = createCompareLocationsService({
			storage: memoryStorage(),
		});
		service.save("solar", "2026-08-12", munich, [berlin]);
		service.save("lunar", "2026-08-12", munich, [paris]);
		expect(service.load("solar", "2026-08-12", munich)).toEqual([berlin]);
		expect(service.load("lunar", "2026-08-12", munich)).toEqual([paris]);
	});

	it("does not leak extras to a different observer", () => {
		const service = createCompareLocationsService({
			storage: memoryStorage(),
		});
		service.save("solar", "2026-08-12", munich, [berlin]);
		expect(service.load("solar", "2026-08-12", berlin)).toEqual([]);
	});

	it("clears storage when the last extra is removed", () => {
		const store = memoryStorage();
		const service = createCompareLocationsService({ storage: store });
		service.save("solar", "2026-08-12", munich, [berlin]);
		service.save("solar", "2026-08-12", munich, []);
		expect(service.load("solar", "2026-08-12", munich)).toEqual([]);
		expect(store.getItem("umbra-compare-locations-v1")).toBe("{}");
	});
});

describe("compareStorageKey", () => {
	it("uses fixed precision so tiny height changes still match", () => {
		expect(compareStorageKey("solar", "2026-08-12", munich)).toBe(
			"solar:2026-08-12:48.13700:11.57600",
		);
	});
});

describe("storage edge cases", () => {
	it("returns empty data when storage is unavailable", () => {
		const service = createCompareLocationsService({ storage: null });
		expect(service.load("solar", "2026-08-12", munich)).toEqual([]);
		service.save("solar", "2026-08-12", munich, [berlin]);
	});

	it("ignores invalid persisted data and filters bad locations", () => {
		const service = createCompareLocationsService({
			storage: memoryStorage({
				"umbra-compare-locations-v1": "not-json",
			}),
		});
		expect(service.load("solar", "2026-08-12", munich)).toEqual([]);

		const normalized = createCompareLocationsService({
			storage: memoryStorage({
				"umbra-compare-locations-v1": JSON.stringify({
					"": [{ lat: 1, lon: 2 }],
					"solar:2026-08-12:48.13700:11.57600": [
						{ lat: Number.NaN, lon: 2 },
						{ lat: 52.52, lon: 13.405, label: "Berlin" },
						"invalid",
					],
					bad: "nope",
				}),
			}),
		});
		expect(normalized.load("solar", "2026-08-12", munich)).toEqual([
			{ lat: 52.52, lon: 13.405, height: 0, label: "Berlin" },
		]);

		const arrayRoot = createCompareLocationsService({
			storage: memoryStorage({
				"umbra-compare-locations-v1": JSON.stringify([]),
			}),
		});
		expect(arrayRoot.load("solar", "2026-08-12", munich)).toEqual([]);
	});

	it("drops non-finite locations on save", () => {
		const service = createCompareLocationsService({
			storage: memoryStorage(),
		});
		service.save("solar", "2026-08-12", munich, [
			{ lat: Number.POSITIVE_INFINITY, lon: 1, height: 0, label: "" },
		]);
		expect(service.load("solar", "2026-08-12", munich)).toEqual([]);
	});

	it("ignores quota failures on save", () => {
		const service = createCompareLocationsService({
			storage: {
				getItem: () => "{}",
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
			service.save("solar", "2026-08-12", munich, [berlin]),
		).not.toThrow();
	});

	it("limits extras to two locations", () => {
		const service = createCompareLocationsService({
			storage: memoryStorage(),
		});
		const paris2 = { ...paris, label: "Paris 2" };
		const rome = { lat: 41.9, lon: 12.5, height: 0, label: "Rome" };
		service.save("solar", "2026-08-12", munich, [berlin, paris, paris2, rome]);
		expect(service.load("solar", "2026-08-12", munich)).toEqual([berlin, paris]);
	});

	it("uses browser storage when no deps are provided", () => {
		const store = memoryStorage();
		vi.stubGlobal("localStorage", store);
		const service = createCompareLocationsService();
		service.save("solar", "2026-08-12", munich, [berlin]);
		expect(service.load("solar", "2026-08-12", munich)).toEqual([berlin]);
		vi.unstubAllGlobals();
	});

	it("drops entries when every stored location is invalid", () => {
		const service = createCompareLocationsService({
			storage: memoryStorage({
				"umbra-compare-locations-v1": JSON.stringify({
					"solar:2026-08-12:48.13700:11.57600": [{ lat: 1, lon: Number.NaN }],
				}),
			}),
		});
		expect(service.load("solar", "2026-08-12", munich)).toEqual([]);
	});

	it("normalizes non-string labels on save", () => {
		const service = createCompareLocationsService({
			storage: memoryStorage(),
		});
		service.save("solar", "2026-08-12", munich, [
			{ lat: 52.52, lon: 13.405, height: 0, label: 123 as unknown as string },
		]);
		expect(service.load("solar", "2026-08-12", munich)).toEqual([
			{ lat: 52.52, lon: 13.405, height: 0, label: "" },
		]);
	});
});
