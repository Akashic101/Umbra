import type {
	CircumstanceSample,
	ContactDaylight,
	ContactTimes,
	GlobalEclipseFacts,
	LocalEclipseType,
	ObserverEclipseDetails,
	ObserverLocation,
	PathStatus,
} from "$lib/types";

/** Ensure worker/HMR payloads always have the current details shape. */
export function normalizeObserverDetails(
	raw: unknown,
	fallback: { date: string; location: ObserverLocation },
): ObserverEclipseDetails {
	const record =
		raw && typeof raw === "object"
			? (raw as Partial<ObserverEclipseDetails> & {
					altitudeSeries?: { iso: string; altitudeDeg: number }[];
				})
			: {};

	const location = normalizeLocation(record.location) ?? {
		lat: fallback.location.lat,
		lon: fallback.location.lon,
		height: fallback.location.height,
		label: fallback.location.label,
	};
	const contacts = normalizeContacts(record.contacts);
	const series = normalizeSeries(record.series, record.altitudeSeries);
	const localType = normalizeLocalType(record.localType);

	return {
		date: typeof record.date === "string" ? record.date : fallback.date,
		location,
		visible: Boolean(record.visible ?? localType !== "none"),
		pathStatus: normalizePathStatus(record.pathStatus),
		localType,
		obscuration: num(record.obscuration),
		magnitude: num(record.magnitude),
		moonSunRatio: num(record.moonSunRatio),
		durationSeconds: num(record.durationSeconds),
		centralDurationSeconds: num(record.centralDurationSeconds),
		sunriseIso: strOrNull(record.sunriseIso),
		sunsetIso: strOrNull(record.sunsetIso),
		lookDirectionCode: strOrNull(record.lookDirectionCode),
		lookAzimuthDeg: numOrNull(record.lookAzimuthDeg),
		lookAltitudeDeg: numOrNull(record.lookAltitudeDeg),
		pathWidthMeters: num(record.pathWidthMeters),
		series,
		contactDaylight: normalizeContactDaylight(record.contactDaylight),
		global: normalizeGlobal(record.global),
		contacts,
	};
}

function normalizeSeries(
	series: CircumstanceSample[] | undefined,
	legacy: { iso: string; altitudeDeg: number }[] | undefined,
): CircumstanceSample[] {
	if (Array.isArray(series) && series.length) {
		return series.map((sample) => ({
			iso: String(sample.iso),
			altitudeDeg: num(sample.altitudeDeg),
			azimuthDeg: num(sample.azimuthDeg),
			obscuration: num(sample.obscuration),
			magnitude: num(sample.magnitude),
			moonSunRatio: num(sample.moonSunRatio),
			localType: normalizeLocalType(sample.localType),
			moonPaDeg: Number.isFinite(sample.moonPaDeg)
				? Number(sample.moonPaDeg)
				: -90,
		}));
	}
	if (Array.isArray(legacy)) {
		return legacy.map((sample) => ({
			iso: String(sample.iso),
			altitudeDeg: num(sample.altitudeDeg),
			azimuthDeg: 0,
			obscuration: 0,
			magnitude: 0,
			moonSunRatio: 0,
			localType: "none" as const,
			moonPaDeg: -90,
		}));
	}
	return [];
}

function normalizeContactDaylight(value: unknown): ContactDaylight[] {
	if (!Array.isArray(value)) {
		return [];
	}
	const out: ContactDaylight[] = [];
	for (const item of value) {
		if (!item || typeof item !== "object") {
			continue;
		}
		const row = item as Partial<ContactDaylight>;
		if (
			row.key !== "c1" &&
			row.key !== "c2" &&
			row.key !== "max" &&
			row.key !== "c3" &&
			row.key !== "c4"
		) {
			continue;
		}
		out.push({
			key: row.key,
			phase:
				row.phase === "day" || row.phase === "night" || row.phase === "unknown"
					? row.phase
					: "unknown",
		});
	}
	return out;
}

function normalizeContacts(value: unknown): ContactTimes {
	const record =
		value && typeof value === "object" ? (value as Partial<ContactTimes>) : {};
	return {
		c1: strOrNull(record.c1),
		c2: strOrNull(record.c2),
		max: strOrNull(record.max),
		c3: strOrNull(record.c3),
		c4: strOrNull(record.c4),
	};
}

function normalizeGlobal(value: unknown): GlobalEclipseFacts | null {
	if (!value || typeof value !== "object") {
		return null;
	}
	const g = value as Partial<GlobalEclipseFacts>;
	if (typeof g.greatestIso !== "string") {
		return null;
	}
	return {
		type:
			g.type === "total" ||
			g.type === "annular" ||
			g.type === "hybrid" ||
			g.type === "partial"
				? g.type
				: "partial",
		saros: num(g.saros),
		gamma: num(g.gamma),
		maxMagnitude: num(g.maxMagnitude),
		maxObscuration: num(g.maxObscuration),
		maxMoonSunRatio: num(g.maxMoonSunRatio),
		maxDurationSeconds: num(g.maxDurationSeconds),
		maxCentralDurationSeconds: num(g.maxCentralDurationSeconds),
		pathWidthMeters: num(g.pathWidthMeters),
		greatestLat: num(g.greatestLat),
		greatestLon: num(g.greatestLon),
		greatestIso: g.greatestIso,
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

function normalizeLocalType(value: unknown): LocalEclipseType {
	if (
		value === "none" ||
		value === "partial" ||
		value === "total" ||
		value === "annular"
	) {
		return value;
	}
	return "none";
}

function normalizePathStatus(value: unknown): PathStatus {
	if (
		value === "inside_totality" ||
		value === "inside_annularity" ||
		value === "partial_only" ||
		value === "outside"
	) {
		return value;
	}
	return "outside";
}

function num(value: unknown): number {
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function numOrNull(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function strOrNull(value: unknown): string | null {
	return typeof value === "string" ? value : null;
}
