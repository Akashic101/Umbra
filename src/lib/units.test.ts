import { describe, expect, it, vi } from "vitest";
import {
	celsiusToFahrenheit,
	DISTANCE_STORAGE_KEY,
	fahrenheitToCelsius,
	formatDistanceAway,
	formatElevation,
	formatPathWidth,
	formatTemperature,
	kmToMiles,
	metersToFeet,
	readDistanceUnit,
	readTemperatureUnit,
	TEMPERATURE_STORAGE_KEY,
	writeDistanceUnit,
	writeTemperatureUnit,
} from "./units";

vi.mock("$lib/paraglide/messages.js", () => ({
	m: {
		emDash: () => "—",
		elevationMeters: ({ meters }: { meters: number }) => `${meters} m`,
		elevationFeet: ({ feet }: { feet: number }) => `${feet} ft`,
		compareDistanceKm: ({ km }: { km: string }) => `${km} km away`,
		compareDistanceMi: ({ mi }: { mi: string }) => `${mi} mi away`,
		pathWidthKm: ({ km }: { km: string }) => `${km} km`,
		pathWidthM: ({ meters }: { meters: number }) => `${meters} m`,
		pathWidthMi: ({ mi }: { mi: string }) => `${mi} mi`,
		pathWidthFt: ({ feet }: { feet: number }) => `${feet} ft`,
		temperatureCelsius: ({ degrees }: { degrees: number }) => `${degrees} °C`,
		temperatureFahrenheit: ({ degrees }: { degrees: number }) =>
			`${degrees} °F`,
	},
}));

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
		getItem(key) {
			return Object.hasOwn(data, key) ? data[key] : null;
		},
		key() {
			return null;
		},
		removeItem(key) {
			delete data[key];
		},
		setItem(key, value) {
			data[key] = value;
		},
	};
}

describe("unit preference storage", () => {
	it("defaults distance to metric and temperature to celsius", () => {
		expect(readDistanceUnit(memoryStorage())).toBe("metric");
		expect(readTemperatureUnit(memoryStorage())).toBe("celsius");
	});

	it("persists imperial and fahrenheit preferences", () => {
		const storage = memoryStorage();
		writeDistanceUnit("imperial", storage);
		writeTemperatureUnit("fahrenheit", storage);
		expect(storage.getItem(DISTANCE_STORAGE_KEY)).toBe("imperial");
		expect(storage.getItem(TEMPERATURE_STORAGE_KEY)).toBe("fahrenheit");
		expect(readDistanceUnit(storage)).toBe("imperial");
		expect(readTemperatureUnit(storage)).toBe("fahrenheit");
	});

	it("clears storage when returning to defaults", () => {
		const storage = memoryStorage({
			[DISTANCE_STORAGE_KEY]: "imperial",
			[TEMPERATURE_STORAGE_KEY]: "fahrenheit",
		});
		writeDistanceUnit("metric", storage);
		writeTemperatureUnit("celsius", storage);
		expect(storage.getItem(DISTANCE_STORAGE_KEY)).toBeNull();
		expect(storage.getItem(TEMPERATURE_STORAGE_KEY)).toBeNull();
	});
});

describe("conversions", () => {
	it("converts length and temperature", () => {
		expect(metersToFeet(100)).toBeCloseTo(328.084, 2);
		expect(kmToMiles(10)).toBeCloseTo(6.2137, 3);
		expect(celsiusToFahrenheit(0)).toBe(32);
		expect(celsiusToFahrenheit(100)).toBe(212);
		expect(fahrenheitToCelsius(32)).toBe(0);
		expect(fahrenheitToCelsius(212)).toBe(100);
	});
});

describe("formatters", () => {
	it("formats elevation in both systems", () => {
		expect(formatElevation(520, "metric")).toBe("520 m");
		expect(formatElevation(520, "imperial")).toBe("1706 ft");
		expect(formatElevation(Number.NaN, "metric")).toBe("—");
	});

	it("formats distances in both systems", () => {
		expect(formatDistanceAway(42, "metric")).toBe("42 km away");
		expect(formatDistanceAway(42, "imperial")).toBe("26 mi away");
		expect(formatDistanceAway(5, "imperial")).toBe("3.1 mi away");
	});

	it("formats path width thresholds", () => {
		expect(formatPathWidth(25_000, "metric")).toBe("25 km");
		expect(formatPathWidth(2_500, "metric")).toBe("2.5 km");
		expect(formatPathWidth(400, "metric")).toBe("400 m");
		expect(formatPathWidth(25_000, "imperial")).toBe("16 mi");
		expect(formatPathWidth(3_000, "imperial")).toBe("1.9 mi");
		expect(formatPathWidth(400, "imperial")).toBe("1312 ft");
		expect(formatPathWidth(0, "metric")).toBe("—");
	});

	it("formats temperatures in both systems", () => {
		expect(formatTemperature(20, "celsius")).toBe("20 °C");
		expect(formatTemperature(20, "fahrenheit")).toBe("68 °F");
		expect(formatTemperature(Number.NaN, "celsius")).toBe("—");
	});
});
