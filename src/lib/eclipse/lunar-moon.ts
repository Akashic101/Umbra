import {
	Body,
	Equator,
	Horizon,
	Observer,
	SearchRiseSet,
} from "astronomy-engine";
import type { ObserverLocation } from "$lib/types";

const COMPASS = [
	"N",
	"NNE",
	"NE",
	"ENE",
	"E",
	"ESE",
	"SE",
	"SSE",
	"S",
	"SSW",
	"SW",
	"WSW",
	"W",
	"WNW",
	"NW",
	"NNW",
] as const;

export type MoonHorizontal = {
	altitudeDeg: number;
	azimuthDeg: number;
};

function toObserver(location: ObserverLocation): Observer {
	return new Observer(location.lat, location.lon, location.height || 0);
}

/** Apparent Moon altitude/azimuth at an observer (refraction applied). */
export function moonHorizontal(
	iso: string,
	location: ObserverLocation,
): MoonHorizontal {
	const date = new Date(iso);
	const observer = toObserver(location);
	const eq = Equator(Body.Moon, date, observer, true, true);
	const hor = Horizon(date, observer, eq.ra, eq.dec, "normal");
	return {
		altitudeDeg: hor.altitude,
		azimuthDeg: hor.azimuth,
	};
}

export function moonIsUp(iso: string, location: ObserverLocation): boolean {
	return moonHorizontal(iso, location).altitudeDeg > 0;
}

export function azimuthToCompass(azimuthDeg: number): string {
	const az = ((azimuthDeg % 360) + 360) % 360;
	const idx = Math.round(az / 22.5) % 16;
	return COMPASS[idx];
}

function searchIso(
	location: ObserverLocation,
	start: Date,
	direction: 1 | -1,
	limitDays: number,
): string | null {
	const time = SearchRiseSet(
		Body.Moon,
		toObserver(location),
		direction,
		start,
		limitDays,
	);
	return time ? time.date.toISOString() : null;
}

/** Moonrise/moonset bracketing an instant (search window around `aroundIso`). */
export function moonRiseSet(
	aroundIso: string,
	location: ObserverLocation,
): { riseIso: string | null; setIso: string | null } {
	const aroundMs = Date.parse(aroundIso);
	if (!Number.isFinite(aroundMs)) {
		return { riseIso: null, setIso: null };
	}
	const start = new Date(aroundMs - 18 * 60 * 60 * 1000);
	return {
		riseIso: searchIso(location, start, 1, 2),
		setIso: searchIso(location, start, -1, 2),
	};
}

/** True if the Moon is above the horizon at any of `count` samples in [start, end]. */
export function moonUpDuring(
	startIso: string | null,
	endIso: string | null,
	location: ObserverLocation,
	count = 8,
): boolean {
	if (!startIso || !endIso) {
		return false;
	}
	const startMs = Date.parse(startIso);
	const endMs = Date.parse(endIso);
	if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
		return false;
	}
	const steps = Math.max(2, count);
	for (let i = 0; i < steps; i++) {
		const t = startMs + ((endMs - startMs) * i) / (steps - 1);
		if (moonHorizontal(new Date(t).toISOString(), location).altitudeDeg > 0) {
			return true;
		}
	}
	return false;
}
