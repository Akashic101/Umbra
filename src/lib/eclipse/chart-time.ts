/** Shared time-axis helpers for altitude / azimuth / obscuration charts. */

export const CHART_THIRTY_MIN_MS = 30 * 60 * 1000;

/** 30-minute UTC boundaries strictly between start and end (skips edges within 5 min). */
export function thirtyMinuteTickMs(startMs: number, endMs: number): number[] {
	if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
		return [];
	}
	const edgePad = 5 * 60 * 1000;
	const first = Math.ceil((startMs + 1) / CHART_THIRTY_MIN_MS) * CHART_THIRTY_MIN_MS;
	const ticks: number[] = [];
	for (let t = first; t < endMs; t += CHART_THIRTY_MIN_MS) {
		if (t - startMs < edgePad || endMs - t < edgePad) {
			continue;
		}
		ticks.push(t);
	}
	return ticks;
}

export function chartXAtMs(
	ms: number,
	startMs: number,
	spanMs: number,
	padL: number,
	plotW: number,
): number {
	return padL + (plotW * (ms - startMs)) / spanMs;
}

export function formatChartHm(ms: number, timeZone?: string): string {
	return new Intl.DateTimeFormat(undefined, {
		timeZone,
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	}).format(new Date(ms));
}

export type ContactMarkerKey = "c1" | "c2" | "max" | "c3" | "c4";

export function contactMarkerDefs(contacts: {
	c1: string | null;
	c2: string | null;
	max: string | null;
	c3: string | null;
	c4: string | null;
}): { key: ContactMarkerKey; iso: string | null; label: string }[] {
	return [
		{ key: "c1", iso: contacts.c1, label: "C1" },
		{ key: "c2", iso: contacts.c2, label: "C2" },
		{ key: "max", iso: contacts.max, label: "Max" },
		{ key: "c3", iso: contacts.c3, label: "C3" },
		{ key: "c4", iso: contacts.c4, label: "C4" },
	];
}
