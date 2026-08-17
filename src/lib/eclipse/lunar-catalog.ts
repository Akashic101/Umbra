import type {
	LunarCatalogEntry,
	LunarContactTimes,
	LunarEclipseType,
} from "$lib/types";
import rawCatalog from "./lunar-catalog.json";

type JsonType = "N" | "P" | "T";

type JsonEntry = {
	date: string;
	td: string;
	deltaT: number;
	saros: number;
	type: JsonType;
	gamma: number;
	penMag: number;
	umMag: number;
	penMin: number | null;
	parMin: number | null;
	totMin: number | null;
	zenithLat: number;
	zenithLon: number;
};

const JSON_TYPE: Record<JsonType, LunarEclipseType> = {
	N: "penumbral",
	P: "partial",
	T: "total",
};

const jsonCatalog = rawCatalog as JsonEntry[];

function minutesToSeconds(minutes: number | null): number {
	if (minutes === null || !Number.isFinite(minutes) || minutes <= 0) {
		return 0;
	}
	return minutes * 60;
}

/** UTC milliseconds of greatest eclipse: TD of greatest minus ΔT (seconds). */
function greatestUtcMs(entry: JsonEntry): number {
	const year = Number(entry.date.slice(0, 4));
	const month = Number(entry.date.slice(5, 7));
	const day = Number(entry.date.slice(8, 10));
	const hours = Number(entry.td.slice(0, 2));
	const minutes = Number(entry.td.slice(3, 5));
	const seconds = Number(entry.td.slice(6, 8));
	const tdMs = Date.UTC(year, month - 1, day, hours, minutes, seconds);
	return tdMs - entry.deltaT * 1000;
}

function offsetIso(
	greatestMs: number,
	durationMinutes: number | null,
	sign: -1 | 1,
): string | null {
	if (durationMinutes === null || durationMinutes <= 0) {
		return null;
	}
	return new Date(
		greatestMs + sign * (durationMinutes / 2) * 60 * 1000,
	).toISOString();
}

function lunarContactsFromJson(entry: JsonEntry): LunarContactTimes {
	const greatestMs = greatestUtcMs(entry);
	return {
		p1: offsetIso(greatestMs, entry.penMin, -1),
		u1: offsetIso(greatestMs, entry.parMin, -1),
		u2: offsetIso(greatestMs, entry.totMin, -1),
		max: new Date(greatestMs).toISOString(),
		u3: offsetIso(greatestMs, entry.totMin, 1),
		u4: offsetIso(greatestMs, entry.parMin, 1),
		p4: offsetIso(greatestMs, entry.penMin, 1),
	};
}

function toCatalogEntry(entry: JsonEntry): LunarCatalogEntry {
	const contacts = lunarContactsFromJson(entry);
	return {
		date: entry.date,
		type: JSON_TYPE[entry.type],
		saros: entry.saros,
		gamma: entry.gamma,
		penumbralMagnitude: entry.penMag,
		umbralMagnitude: entry.umMag,
		penumbralDurationSeconds: minutesToSeconds(entry.penMin),
		umbralDurationSeconds: minutesToSeconds(entry.parMin),
		totalDurationSeconds: minutesToSeconds(entry.totMin),
		zenithLat: entry.zenithLat,
		zenithLon: entry.zenithLon,
		greatestIso: contacts.max ?? new Date(greatestUtcMs(entry)).toISOString(),
		contacts,
	};
}

const catalog: LunarCatalogEntry[] = jsonCatalog.map(toCatalogEntry);
const byDate = new Map(catalog.map((entry) => [entry.date, entry]));

export function listLunarCatalog(): LunarCatalogEntry[] {
	return catalog;
}

export function getLunarCatalogEntry(date: string): LunarCatalogEntry {
	const entry = byDate.get(date);
	if (!entry) {
		throw new Error(`No lunar eclipse catalog entry for ${date}.`);
	}
	return entry;
}
