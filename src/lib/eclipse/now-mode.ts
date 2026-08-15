import type { CircumstanceSample, ContactTimes } from "$lib/types";

export type ContactKey = "c1" | "c2" | "max" | "c3" | "c4";

export type EclipseNowPhase =
	| "upcoming"
	| "partial_ingress"
	| "central"
	| "partial_egress"
	| "ended";

export type EclipseNowState = {
	phase: EclipseNowPhase;
	/** True while local time is between C1 and C4 (inclusive of C1, exclusive of C4 end). */
	isLive: boolean;
	/** 0–1 through C1→C4 while live; null otherwise. */
	progress01: number | null;
	nextKey: ContactKey | null;
	nextMs: number | null;
	remainingToNextMs: number | null;
	remainingToMaxMs: number | null;
	/** While in central phase: ms remaining until C3. */
	remainingOfCentralMs: number | null;
	c1Ms: number | null;
	c4Ms: number | null;
	maxMs: number | null;
};

function parseMs(iso: string | null | undefined): number | null {
	if (!iso) {
		return null;
	}
	const ms = Date.parse(iso);
	return Number.isFinite(ms) ? ms : null;
}

/**
 * Live eclipse timeline for an observer from contact times and wall clock.
 * Pure: pass `nowMs` from a ticking clock in the UI.
 */
export function getEclipseNowState(
	contacts: ContactTimes,
	nowMs: number,
): EclipseNowState | null {
	const c1Ms = parseMs(contacts.c1);
	const c2Ms = parseMs(contacts.c2);
	const maxMs = parseMs(contacts.max);
	const c3Ms = parseMs(contacts.c3);
	const c4Ms = parseMs(contacts.c4);
	if (c1Ms === null || c4Ms === null || !Number.isFinite(nowMs)) {
		return null;
	}

	const ordered: { key: ContactKey; ms: number }[] = [{ key: "c1", ms: c1Ms }];
	if (c2Ms !== null) {
		ordered.push({ key: "c2", ms: c2Ms });
	}
	if (maxMs !== null) {
		ordered.push({ key: "max", ms: maxMs });
	}
	if (c3Ms !== null) {
		ordered.push({ key: "c3", ms: c3Ms });
	}
	ordered.push({ key: "c4", ms: c4Ms });
	ordered.sort((a, b) => a.ms - b.ms);

	let nextKey: ContactKey | null = null;
	let nextMs: number | null = null;
	for (const row of ordered) {
		if (row.ms > nowMs) {
			nextKey = row.key;
			nextMs = row.ms;
			break;
		}
	}

	let phase: EclipseNowPhase;
	if (nowMs < c1Ms) {
		phase = "upcoming";
	} else if (nowMs >= c4Ms) {
		phase = "ended";
	} else if (c2Ms !== null && c3Ms !== null && nowMs >= c2Ms && nowMs < c3Ms) {
		phase = "central";
	} else if (maxMs !== null && nowMs >= maxMs) {
		phase = "partial_egress";
	} else if (c2Ms !== null && nowMs >= c2Ms) {
		// Between C2 and Max when Max is after C2 (normal), still central handled above;
		// if somehow past C2 without C3, treat as central-ish egress via max.
		phase = maxMs !== null && nowMs < maxMs ? "central" : "partial_egress";
	} else {
		phase = "partial_ingress";
	}

	const isLive = nowMs >= c1Ms && nowMs < c4Ms;
	const span = Math.max(c4Ms - c1Ms, 1);
	const progress01 = isLive
		? Math.min(1, Math.max(0, (nowMs - c1Ms) / span))
		: null;

	const remainingToNextMs =
		nextMs !== null ? Math.max(0, nextMs - nowMs) : null;
	const remainingToMaxMs =
		maxMs !== null && nowMs < maxMs ? Math.max(0, maxMs - nowMs) : null;
	const remainingOfCentralMs =
		phase === "central" && c3Ms !== null ? Math.max(0, c3Ms - nowMs) : null;

	return {
		phase,
		isLive,
		progress01,
		nextKey,
		nextMs,
		remainingToNextMs,
		remainingToMaxMs,
		remainingOfCentralMs,
		c1Ms,
		c4Ms,
		maxMs,
	};
}

/** Index in a C1–C4 sample series nearest to `nowMs`. */
export function seriesIndexAtMs(
	series: CircumstanceSample[],
	nowMs: number,
): number {
	if (series.length === 0) {
		return 0;
	}
	let best = 0;
	let bestDist = Number.POSITIVE_INFINITY;
	for (let i = 0; i < series.length; i++) {
		const ms = Date.parse(series[i].iso);
		if (!Number.isFinite(ms)) {
			continue;
		}
		const dist = Math.abs(ms - nowMs);
		if (dist < bestDist) {
			bestDist = dist;
			best = i;
		}
	}
	return best;
}
