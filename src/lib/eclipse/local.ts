import type {
	LocalCircumstances,
	LocalEclipseType,
	LocalSummary,
	ObserverLocation,
} from "$lib/types";
import { getEclipse, toAstronomyLocation } from "./catalog";
import { toiToIso } from "./toi";

const NOT_VISIBLE = "No solar eclipse visible at this location";

export function getLocalSummary(
	date: string,
	location: ObserverLocation,
): LocalSummary {
	try {
		const local = getEclipse(date).getLocalEclipse(
			toAstronomyLocation(location),
		);
		const type = local.getType() as LocalEclipseType;
		const visible = type !== "none";
		return {
			date,
			visible,
			localType: type,
			obscuration: visible ? local.getMaxObscuration() : 0,
			magnitude: visible ? local.getMaxMagnitude() : 0,
			durationSeconds: visible ? local.getDuration() : 0,
			centralDurationSeconds: visible ? local.getCentralDuration() : 0,
		};
	} catch (error) {
		if (isNotVisible(error)) {
			return notVisible(date);
		}
		throw error;
	}
}

export function getLocalCircumstances(
	date: string,
	location: ObserverLocation,
): LocalCircumstances {
	try {
		const local = getEclipse(date).getLocalEclipse(
			toAstronomyLocation(location),
		);
		const type = local.getType() as LocalEclipseType;
		const visible = type !== "none";
		const contacts = local.getContactTimes();
		return {
			date,
			visible,
			localType: type,
			obscuration: visible ? local.getMaxObscuration() : 0,
			magnitude: visible ? local.getMaxMagnitude() : 0,
			durationSeconds: visible ? local.getDuration() : 0,
			centralDurationSeconds: visible ? local.getCentralDuration() : 0,
			moonSunRatio: visible ? local.getMaxMoonSunRatio() : 0,
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
			return {
				...notVisible(date),
				moonSunRatio: 0,
				contacts: { c1: null, c2: null, max: null, c3: null, c4: null },
			};
		}
		throw error;
	}
}

export function getLocalSummaries(
	dates: string[],
	location: ObserverLocation,
): LocalSummary[] {
	return dates.map((date) => getLocalSummary(date, location));
}

function notVisible(date: string): LocalSummary {
	return {
		date,
		visible: false,
		localType: "none",
		obscuration: 0,
		magnitude: 0,
		durationSeconds: 0,
		centralDurationSeconds: 0,
	};
}

function isNotVisible(error: unknown): boolean {
	return error instanceof Error && error.message.includes(NOT_VISIBLE);
}
