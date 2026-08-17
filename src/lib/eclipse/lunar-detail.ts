import type {
	LunarCatalogEntry,
	LunarCircumstanceSample,
	LunarContactKey,
	LunarContactMoon,
	LunarContactTimes,
	LunarGlobalFacts,
	LunarLocalType,
	LunarObserverDetails,
	ObserverLocation,
} from "$lib/types";
import { getLunarCatalogEntry } from "./lunar-catalog";
import { getLunarLocalSummary } from "./lunar-local";
import {
	azimuthToCompass,
	moonHorizontal,
	moonIsUp,
	moonRiseSet,
} from "./lunar-moon";

const SAMPLE_COUNT = 32;
const CONTACT_ORDER: LunarContactKey[] = [
	"p1",
	"u1",
	"u2",
	"max",
	"u3",
	"u4",
	"p4",
];

function lerpPeak(
	t: number,
	start: number | null,
	peak: number | null,
	end: number | null,
	peakValue: number,
): number {
	if (start === null || peak === null || end === null || t < start || t > end) {
		return 0;
	}
	if (peak <= start || end <= peak) {
		return t === peak ? Math.max(0, peakValue) : 0;
	}
	if (t <= peak) {
		return peakValue * ((t - start) / (peak - start));
	}
	return peakValue * ((end - t) / (end - peak));
}

function parseMs(iso: string | null): number | null {
	if (!iso) {
		return null;
	}
	const ms = Date.parse(iso);
	return Number.isFinite(ms) ? ms : null;
}

function magnitudesAtMs(
	ms: number,
	contacts: LunarContactTimes,
	entry: LunarCatalogEntry,
): { umbral: number; penumbral: number } {
	const p1 = parseMs(contacts.p1);
	const u1 = parseMs(contacts.u1);
	const max = parseMs(contacts.max);
	const u4 = parseMs(contacts.u4);
	const p4 = parseMs(contacts.p4);
	return {
		penumbral: lerpPeak(ms, p1, max, p4, entry.penumbralMagnitude),
		umbral: lerpPeak(ms, u1, max, u4, Math.max(0, entry.umbralMagnitude)),
	};
}

function typeFromMagnitudes(umbral: number, penumbral: number): LunarLocalType {
	if (umbral >= 1) {
		return "total";
	}
	if (umbral > 0) {
		return "partial";
	}
	if (penumbral > 0) {
		return "penumbral";
	}
	return "none";
}

function globalFacts(entry: LunarCatalogEntry): LunarGlobalFacts {
	return {
		type: entry.type,
		saros: entry.saros,
		gamma: entry.gamma,
		penumbralMagnitude: entry.penumbralMagnitude,
		umbralMagnitude: entry.umbralMagnitude,
		penumbralDurationSeconds: entry.penumbralDurationSeconds,
		umbralDurationSeconds: entry.umbralDurationSeconds,
		totalDurationSeconds: entry.totalDurationSeconds,
		zenithLat: entry.zenithLat,
		zenithLon: entry.zenithLon,
		greatestIso: entry.greatestIso,
	};
}

function buildSeries(
	entry: LunarCatalogEntry,
	location: ObserverLocation,
): LunarCircumstanceSample[] {
	const startIso = entry.contacts.p1 ?? entry.contacts.max;
	const endIso = entry.contacts.p4 ?? entry.contacts.max;
	if (!startIso || !endIso) {
		return [];
	}
	const startMs = Date.parse(startIso);
	const endMs = Date.parse(endIso);
	if (
		!Number.isFinite(startMs) ||
		!Number.isFinite(endMs) ||
		endMs <= startMs
	) {
		return [];
	}
	const series: LunarCircumstanceSample[] = [];
	for (let i = 0; i < SAMPLE_COUNT; i++) {
		const ms = startMs + ((endMs - startMs) * i) / (SAMPLE_COUNT - 1);
		const iso = new Date(ms).toISOString();
		const horiz = moonHorizontal(iso, location);
		const mags = magnitudesAtMs(ms, entry.contacts, entry);
		series.push({
			iso,
			altitudeDeg: horiz.altitudeDeg,
			azimuthDeg: horiz.azimuthDeg,
			umbralMagnitude: mags.umbral,
			penumbralMagnitude: mags.penumbral,
			localType: typeFromMagnitudes(mags.umbral, mags.penumbral),
		});
	}
	return series;
}

function contactMoonRows(
	contacts: LunarContactTimes,
	location: ObserverLocation,
): LunarContactMoon[] {
	const rows: LunarContactMoon[] = [];
	for (const key of CONTACT_ORDER) {
		const iso = contacts[key];
		if (!iso) {
			continue;
		}
		rows.push({ key, moonUp: moonIsUp(iso, location) });
	}
	return rows;
}

export function getLunarObserverDetails(
	date: string,
	location: ObserverLocation,
): LunarObserverDetails {
	const entry = getLunarCatalogEntry(date);
	const summary = getLunarLocalSummary(date, location);
	const lookIso = entry.contacts.max ?? entry.greatestIso;
	const look = moonHorizontal(lookIso, location);
	const riseSet = moonRiseSet(lookIso, location);
	return {
		date,
		location: {
			lat: location.lat,
			lon: location.lon,
			height: location.height,
			label: location.label,
		},
		visible: summary.visible,
		localType: summary.localType,
		penumbralMagnitude: summary.penumbralMagnitude,
		umbralMagnitude: summary.umbralMagnitude,
		durationSeconds: summary.durationSeconds,
		umbralDurationSeconds: summary.umbralDurationSeconds,
		totalDurationSeconds: summary.totalDurationSeconds,
		moonriseIso: riseSet.riseIso,
		moonsetIso: riseSet.setIso,
		lookDirectionCode: azimuthToCompass(look.azimuthDeg),
		lookAzimuthDeg: look.azimuthDeg,
		lookAltitudeDeg: look.altitudeDeg,
		series: buildSeries(entry, location),
		contactMoon: contactMoonRows(entry.contacts, location),
		global: globalFacts(entry),
		contacts: entry.contacts,
	};
}
