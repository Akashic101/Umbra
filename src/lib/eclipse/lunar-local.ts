import type {
	LunarCatalogEntry,
	LunarLocalCircumstances,
	LunarLocalSummary,
	LunarLocalType,
	ObserverLocation,
} from "$lib/types";
import { getLunarCatalogEntry, listLunarCatalog } from "./lunar-catalog";
import { moonUpDuring } from "./lunar-moon";

function localTypeAndVisible(
	entry: LunarCatalogEntry,
	location: ObserverLocation,
): { visible: boolean; localType: LunarLocalType } {
	const { contacts } = entry;
	if (
		contacts.u2 &&
		contacts.u3 &&
		moonUpDuring(contacts.u2, contacts.u3, location)
	) {
		return { visible: true, localType: "total" };
	}
	if (
		contacts.u1 &&
		contacts.u4 &&
		moonUpDuring(contacts.u1, contacts.u4, location)
	) {
		return { visible: true, localType: "partial" };
	}
	if (
		entry.type === "penumbral" &&
		moonUpDuring(contacts.p1, contacts.p4, location)
	) {
		return { visible: true, localType: "penumbral" };
	}
	return { visible: false, localType: "none" };
}

function durationForType(
	entry: LunarCatalogEntry,
	localType: LunarLocalType,
): number {
	if (localType === "total") {
		return entry.totalDurationSeconds;
	}
	if (localType === "partial") {
		return entry.umbralDurationSeconds;
	}
	if (localType === "penumbral") {
		return entry.penumbralDurationSeconds;
	}
	return 0;
}

export function getLunarLocalSummary(
	date: string,
	location: ObserverLocation,
): LunarLocalSummary {
	const entry = getLunarCatalogEntry(date);
	const { visible, localType } = localTypeAndVisible(entry, location);
	return {
		date,
		visible,
		localType,
		penumbralMagnitude: entry.penumbralMagnitude,
		umbralMagnitude: entry.umbralMagnitude,
		durationSeconds: durationForType(entry, localType),
		umbralDurationSeconds: entry.umbralDurationSeconds,
		totalDurationSeconds: entry.totalDurationSeconds,
	};
}

export function getLunarLocalCircumstances(
	date: string,
	location: ObserverLocation,
): LunarLocalCircumstances {
	const entry = getLunarCatalogEntry(date);
	const summary = getLunarLocalSummary(date, location);
	return {
		...summary,
		contacts: entry.contacts,
	};
}

export function getLunarLocalSummaries(
	location: ObserverLocation,
): LunarLocalSummary[] {
	return listLunarCatalog().map((entry) =>
		getLunarLocalSummary(entry.date, location),
	);
}
