import { azimuth2direction, TimeOfInterest } from "@astronomy-bundle/core";
import type { SolarEclipse } from "@astronomy-bundle/solar-eclipse";
import type {
	CircumstanceSample,
	ContactDaylight,
	ContactTimes,
	DaylightPhase,
	GlobalEclipseFacts,
	LocalEclipseType,
	ObserverEclipseDetails,
	ObserverLocation,
	PathStatus,
} from "$lib/types";
import { getEclipse, toAstronomyLocation } from "./catalog";
import { toiToIso } from "./toi";

const NOT_VISIBLE = "No solar eclipse visible at this location";
const SAMPLE_COUNT = 32;

function pathStatusFromLocalType(type: LocalEclipseType): PathStatus {
	switch (type) {
		case "total":
			return "inside_totality";
		case "annular":
			return "inside_annularity";
		case "partial":
			return "partial_only";
		default:
			return "outside";
	}
}

export function getObserverEclipseDetails(
	date: string,
	location: ObserverLocation,
): ObserverEclipseDetails {
	const eclipse = getEclipse(date);
	const global = buildGlobalFacts(eclipse);

	try {
		const local = eclipse.getLocalEclipse(toAstronomyLocation(location));
		const type = local.getType() as LocalEclipseType;
		const visible = type !== "none";
		const contactsRaw = local.getContactTimes();
		const pathStatus = pathStatusFromLocalType(type);
		const pathWidthMeters =
			type === "total" || type === "annular" ? local.getUmbraPathWidth() : 0;

		const obscuration = visible ? local.getMaxObscuration() : 0;
		const magnitude = visible ? local.getMaxMagnitude() : 0;
		const moonSunRatio = visible ? local.getMaxMoonSunRatio() : 0;
		const durationSeconds = visible ? local.getDuration() : 0;
		const centralDurationSeconds = visible ? local.getCentralDuration() : 0;

		let lookAzimuth: number | null = null;
		let lookAltitude: number | null = null;
		let lookDirectionCode: string | null = null;
		const series: CircumstanceSample[] = [];

		if (contactsRaw?.max) {
			const atMax = local
				.getCircumstances(contactsRaw.max)
				.getApparentTopocentricHorizontalCoordinates();
			lookAzimuth = atMax.azimuth;
			lookAltitude = atMax.altitude;
			lookDirectionCode = azimuth2direction(lookAzimuth);
		}

		if (contactsRaw?.c1 && contactsRaw?.c4) {
			const startMs = contactsRaw.c1.getDate().getTime();
			const endMs = contactsRaw.c4.getDate().getTime();
			const span = Math.max(endMs - startMs, 1);
			// Diameter ratio is effectively constant over the eclipse; API only
			// exposes max moon/sun ratio, not a per-sample value.
			const sampleMoonSunRatio = moonSunRatio;
			for (let i = 0; i < SAMPLE_COUNT; i++) {
				const t = startMs + (span * i) / (SAMPLE_COUNT - 1);
				const toi = TimeOfInterest.fromDate(new Date(t));
				const circ = local.getCircumstances(toi);
				const horizontal = circ.getApparentTopocentricHorizontalCoordinates();
				series.push({
					iso: toi.getDate().toISOString(),
					altitudeDeg: horizontal.altitude,
					azimuthDeg: horizontal.azimuth,
					obscuration: circ.getObscuration(),
					magnitude: circ.getMagnitude(),
					moonSunRatio: sampleMoonSunRatio,
					localType: circ.getEclipseType() as LocalEclipseType,
					moonPaDeg: moonPositionAngleDeg(circ),
				});
			}
		}

		const contacts: ContactTimes = {
			c1: toiToIso(contactsRaw?.c1),
			c2: toiToIso(contactsRaw?.c2),
			max: toiToIso(contactsRaw?.max),
			c3: toiToIso(contactsRaw?.c3),
			c4: toiToIso(contactsRaw?.c4),
		};
		const sunriseIso = toiToIso(contactsRaw?.sunrise);
		const sunsetIso = toiToIso(contactsRaw?.sunset);

		return {
			date,
			location: {
				lat: location.lat,
				lon: location.lon,
				height: location.height,
				label: location.label,
			},
			visible,
			pathStatus,
			localType: type,
			obscuration,
			magnitude,
			moonSunRatio,
			durationSeconds,
			centralDurationSeconds,
			sunriseIso,
			sunsetIso,
			lookDirectionCode,
			lookAzimuthDeg: lookAzimuth,
			lookAltitudeDeg: lookAltitude,
			pathWidthMeters,
			series,
			contactDaylight: buildContactDaylight(contacts, sunriseIso, sunsetIso),
			global,
			contacts,
		};
	} catch (error) {
		if (isNotVisible(error)) {
			return emptyDetails(date, location, global);
		}
		throw error;
	}
}

function buildGlobalFacts(eclipse: SolarEclipse): GlobalEclipseFacts {
	const greatest = eclipse.getLocationOfGreatestEclipse();
	return {
		type: eclipse.getType() as GlobalEclipseFacts["type"],
		saros: eclipse.getSaros(),
		gamma: eclipse.getGamma(),
		maxMagnitude: eclipse.getMaxMagnitude(),
		maxObscuration: eclipse.getMaxObscuration(),
		maxMoonSunRatio: eclipse.getMaxMoonSunRatio(),
		maxDurationSeconds: eclipse.getMaxDuration(),
		maxCentralDurationSeconds: eclipse.getMaxCentralDuration(),
		pathWidthMeters: eclipse.getUmbraPathWidth(),
		greatestLat: greatest.lat,
		greatestLon: greatest.lon,
		greatestIso: eclipse.getTimeOfGreatestEclipse().getDate().toISOString(),
	};
}

function buildContactDaylight(
	contacts: ContactTimes,
	sunriseIso: string | null,
	sunsetIso: string | null,
): ContactDaylight[] {
	const defs: { key: ContactDaylight["key"]; iso: string | null }[] = [
		{ key: "c1", iso: contacts.c1 },
		{ key: "c2", iso: contacts.c2 },
		{ key: "max", iso: contacts.max },
		{ key: "c3", iso: contacts.c3 },
		{ key: "c4", iso: contacts.c4 },
	];
	const rows: ContactDaylight[] = [];
	for (const def of defs) {
		if (!def.iso) {
			continue;
		}
		rows.push({
			key: def.key,
			phase: daylightPhaseAt(def.iso, sunriseIso, sunsetIso),
		});
	}
	return rows;
}

/** Day if sunrise ≤ t ≤ sunset; overnight when sunset < sunrise. */
function daylightPhaseAt(
	iso: string,
	sunriseIso: string | null,
	sunsetIso: string | null,
): DaylightPhase {
	if (!sunriseIso || !sunsetIso) {
		return "unknown";
	}
	const t = Date.parse(iso);
	const sunrise = Date.parse(sunriseIso);
	const sunset = Date.parse(sunsetIso);
	if (
		!Number.isFinite(t) ||
		!Number.isFinite(sunrise) ||
		!Number.isFinite(sunset)
	) {
		return "unknown";
	}
	if (sunset < sunrise) {
		// Spans midnight: day from sunrise→midnight and midnight→sunset
		return t >= sunrise || t <= sunset ? "day" : "night";
	}
	return t >= sunrise && t <= sunset ? "day" : "night";
}

function moonPositionAngleDeg(circ: unknown): number {
	// Local u,v from Besselian circumstances (private field, not in public typings).
	// Negate so the Moon sits on the contact side of the Sun (entry/exit match sky).
	const uv = (circ as { circumstances?: { u?: number; v?: number } })
		.circumstances;
	const u = typeof uv?.u === "number" ? uv.u : 0;
	const v = typeof uv?.v === "number" ? uv.v : 1;
	return (Math.atan2(-u, -v) * 180) / Math.PI;
}

function emptyDetails(
	date: string,
	location: ObserverLocation,
	global: GlobalEclipseFacts | null,
): ObserverEclipseDetails {
	return {
		date,
		location: {
			lat: location.lat,
			lon: location.lon,
			height: location.height,
			label: location.label,
		},
		visible: false,
		pathStatus: "outside",
		localType: "none",
		obscuration: 0,
		magnitude: 0,
		moonSunRatio: 0,
		durationSeconds: 0,
		centralDurationSeconds: 0,
		sunriseIso: null,
		sunsetIso: null,
		lookDirectionCode: null,
		lookAzimuthDeg: null,
		lookAltitudeDeg: null,
		pathWidthMeters: 0,
		series: [],
		contactDaylight: [],
		global,
		contacts: { c1: null, c2: null, max: null, c3: null, c4: null },
	};
}

function isNotVisible(error: unknown): boolean {
	return error instanceof Error && error.message.includes(NOT_VISIBLE);
}
