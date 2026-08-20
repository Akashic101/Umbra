import { m } from "$lib/paraglide/messages.js";

export const DISTANCE_STORAGE_KEY = "umbra-distance-unit-v1";
export const TEMPERATURE_STORAGE_KEY = "umbra-temperature-unit-v1";

export type DistanceUnit = "metric" | "imperial";
export type TemperatureUnit = "celsius" | "fahrenheit";

export type UnitsStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const METERS_PER_FOOT = 0.3048;
const KM_PER_MILE = 1.609344;

export function readDistanceUnit(
	storage: UnitsStorage | null = defaultStorage(),
): DistanceUnit {
	const raw = storage?.getItem(DISTANCE_STORAGE_KEY);
	return raw === "imperial" ? "imperial" : "metric";
}

export function writeDistanceUnit(
	unit: DistanceUnit,
	storage: UnitsStorage | null = defaultStorage(),
): void {
	if (!storage) {
		return;
	}
	if (unit === "metric") {
		storage.removeItem(DISTANCE_STORAGE_KEY);
		return;
	}
	storage.setItem(DISTANCE_STORAGE_KEY, unit);
}

export function readTemperatureUnit(
	storage: UnitsStorage | null = defaultStorage(),
): TemperatureUnit {
	const raw = storage?.getItem(TEMPERATURE_STORAGE_KEY);
	return raw === "fahrenheit" ? "fahrenheit" : "celsius";
}

export function writeTemperatureUnit(
	unit: TemperatureUnit,
	storage: UnitsStorage | null = defaultStorage(),
): void {
	if (!storage) {
		return;
	}
	if (unit === "celsius") {
		storage.removeItem(TEMPERATURE_STORAGE_KEY);
		return;
	}
	storage.setItem(TEMPERATURE_STORAGE_KEY, unit);
}

export function metersToFeet(meters: number): number {
	return meters / METERS_PER_FOOT;
}

export function kmToMiles(km: number): number {
	return km / KM_PER_MILE;
}

export function celsiusToFahrenheit(celsius: number): number {
	return (celsius * 9) / 5 + 32;
}

export function fahrenheitToCelsius(fahrenheit: number): number {
	return ((fahrenheit - 32) * 5) / 9;
}

/** Format terrain / observer elevation stored in meters. */
export function formatElevation(
	meters: number,
	unit: DistanceUnit = readDistanceUnit(),
): string {
	if (!Number.isFinite(meters)) {
		return m.emDash();
	}
	if (unit === "imperial") {
		return m.elevationFeet({ feet: Math.round(metersToFeet(meters)) });
	}
	return m.elevationMeters({ meters: Math.round(meters) });
}

/** Format a great-circle distance stored in kilometres. */
export function formatDistanceAway(
	km: number,
	unit: DistanceUnit = readDistanceUnit(),
): string {
	if (!Number.isFinite(km) || km < 0) {
		return m.emDash();
	}
	if (unit === "imperial") {
		const miles = kmToMiles(km);
		const rounded = miles >= 10 ? miles.toFixed(0) : miles.toFixed(1);
		return m.compareDistanceMi({ mi: rounded });
	}
	return m.compareDistanceKm({ km: String(Math.round(km)) });
}

/** Format eclipse path width stored in meters. */
export function formatPathWidth(
	meters: number,
	unit: DistanceUnit = readDistanceUnit(),
): string {
	if (!Number.isFinite(meters) || meters <= 0) {
		return m.emDash();
	}
	if (unit === "imperial") {
		const miles = kmToMiles(meters / 1000);
		if (miles >= 10) {
			return m.pathWidthMi({ mi: miles.toFixed(0) });
		}
		if (miles >= 1) {
			return m.pathWidthMi({ mi: miles.toFixed(1) });
		}
		return m.pathWidthFt({ feet: Math.round(metersToFeet(meters)) });
	}
	const km = meters / 1000;
	if (km >= 10) {
		return m.pathWidthKm({ km: km.toFixed(0) });
	}
	if (km >= 1) {
		return m.pathWidthKm({ km: km.toFixed(1) });
	}
	return m.pathWidthM({ meters: Math.round(meters) });
}

/** Format a temperature stored in Celsius. */
export function formatTemperature(
	celsius: number,
	unit: TemperatureUnit = readTemperatureUnit(),
): string {
	if (!Number.isFinite(celsius)) {
		return m.emDash();
	}
	if (unit === "fahrenheit") {
		return m.temperatureFahrenheit({
			degrees: Math.round(celsiusToFahrenheit(celsius)),
		});
	}
	return m.temperatureCelsius({ degrees: Math.round(celsius) });
}

function defaultStorage(): UnitsStorage | null {
	return typeof localStorage === "undefined" ? null : localStorage;
}
