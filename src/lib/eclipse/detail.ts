import { azimuth2direction, TimeOfInterest } from "@astronomy-bundle/core";
import type {
	AltitudeSample,
	LocalEclipseType,
	ObserverEclipseDetails,
	ObserverLocation,
	PathStatus,
} from "$lib/types";
import { getEclipse, toAstronomyLocation } from "./catalog";
import { formatLookDirectionLabel } from "./detail-format";
import { toiToIso } from "./time";

const NOT_VISIBLE = "No solar eclipse visible at this location";
const SAMPLE_COUNT = 32;

export function pathStatusFromLocalType(type: LocalEclipseType): PathStatus {
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
	try {
		const local = getEclipse(date).getLocalEclipse(
			toAstronomyLocation(location),
		);
		const type = local.getType() as LocalEclipseType;
		const contacts = local.getContactTimes();
		const pathStatus = pathStatusFromLocalType(type);
		const pathWidthMeters =
			type === "total" || type === "annular" ? local.getUmbraPathWidth() : 0;

		let lookAzimuth: number | null = null;
		let lookAltitude: number | null = null;
		let lookDirection = "—";
		const altitudeSeries: AltitudeSample[] = [];

		if (contacts?.max) {
			const atMax = local
				.getCircumstances(contacts.max)
				.getApparentTopocentricHorizontalCoordinates();
			lookAzimuth = atMax.azimuth;
			lookAltitude = atMax.altitude;
			lookDirection = formatLookDirectionLabel(
				azimuth2direction(lookAzimuth),
				lookAltitude,
			);
		}

		if (contacts?.c1 && contacts?.c4) {
			const startMs = contacts.c1.getDate().getTime();
			const endMs = contacts.c4.getDate().getTime();
			const span = Math.max(endMs - startMs, 1);
			for (let i = 0; i < SAMPLE_COUNT; i++) {
				const t = startMs + (span * i) / (SAMPLE_COUNT - 1);
				const toi = TimeOfInterest.fromDate(new Date(t));
				const horizontal = local
					.getCircumstances(toi)
					.getApparentTopocentricHorizontalCoordinates();
				altitudeSeries.push({
					iso: toi.getDate().toISOString(),
					altitudeDeg: horizontal.altitude,
				});
			}
		}

		return {
			date,
			location: {
				lat: location.lat,
				lon: location.lon,
				height: location.height,
				label: location.label,
			},
			pathStatus,
			localType: type,
			sunriseIso: toiToIso(contacts?.sunrise),
			sunsetIso: toiToIso(contacts?.sunset),
			lookDirection,
			lookAzimuthDeg: lookAzimuth,
			lookAltitudeDeg: lookAltitude,
			pathWidthMeters,
			altitudeSeries,
			contacts: {
				c1: toiToIso(contacts?.c1),
				c2: toiToIso(contacts?.c2),
				max: toiToIso(contacts?.max),
				c3: toiToIso(contacts?.c3),
				c4: toiToIso(contacts?.c4),
			},
		};
	} catch (error) {
		if (isNotVisible(error)) {
			return emptyDetails(date, location);
		}
		throw error;
	}
}

function emptyDetails(
	date: string,
	location: ObserverLocation,
): ObserverEclipseDetails {
	return {
		date,
		location: {
			lat: location.lat,
			lon: location.lon,
			height: location.height,
			label: location.label,
		},
		pathStatus: "outside",
		localType: "none",
		sunriseIso: null,
		sunsetIso: null,
		lookDirection: "—",
		lookAzimuthDeg: null,
		lookAltitudeDeg: null,
		pathWidthMeters: 0,
		altitudeSeries: [],
		contacts: { c1: null, c2: null, max: null, c3: null, c4: null },
	};
}

function isNotVisible(error: unknown): boolean {
	return error instanceof Error && error.message.includes(NOT_VISIBLE);
}
