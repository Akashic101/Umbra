import { describe, expect, it } from "vitest";
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
