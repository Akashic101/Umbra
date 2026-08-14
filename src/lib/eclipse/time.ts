import type { TimeOfInterest } from "@astronomy-bundle/core";

export function toiToIso(
	toi: TimeOfInterest | null | undefined,
): string | null {
	if (!toi) {
		return null;
	}
	return toi.getDate().toISOString();
}

function deviceTimeZone(): string {
	return typeof Intl === "undefined"
		? "UTC"
		: Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function formatInstant(
	iso: string | null,
	timeZone = deviceTimeZone(),
): string {
	if (!iso) {
		return "—";
	}
	const date = new Date(iso);
	const formatter = new Intl.DateTimeFormat(undefined, {
		timeZone,
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		timeZoneName: "short",
	});
	return formatter.format(date);
}

/** Compact contact time: HH:MM:SS with short timezone; date only when requested. */
export function formatContactTime(
	iso: string | null,
	options: { includeDate?: boolean; timeZone?: string } = {},
): string {
	if (!iso) {
		return "—";
	}
	const timeZone = options.timeZone ?? deviceTimeZone();
	const date = new Date(iso);
	const formatter = new Intl.DateTimeFormat(undefined, {
		timeZone,
		...(options.includeDate
			? { month: "short" as const, day: "numeric" as const }
			: {}),
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
		timeZoneName: "short",
	});
	return formatter.format(date);
}

/** Local calendar day key (YYYY-MM-DD) for comparing contact dates. */
export function localDateKey(iso: string, timeZone = deviceTimeZone()): string {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(new Date(iso));
}

export function formatDuration(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds <= 0) {
		return "—";
	}
	const total = Math.round(seconds);
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const secs = total % 60;
	if (hours > 0) {
		return `${hours}h ${minutes}m ${secs}s`;
	}
	if (minutes > 0) {
		return `${minutes}m ${secs}s`;
	}
	return `${secs}s`;
}

/** Live countdown: years, days, and HH:MM:SS (no fractional seconds). */
export function formatCountdown(ms: number): string {
	if (!Number.isFinite(ms) || ms < 0) {
		return "—";
	}
	const total = Math.floor(ms / 1000);
	const years = Math.floor(total / (365 * 24 * 3600));
	const afterYears = total % (365 * 24 * 3600);
	const days = Math.floor(afterYears / (24 * 3600));
	const afterDays = afterYears % (24 * 3600);
	const hours = Math.floor(afterDays / 3600);
	const minutes = Math.floor((afterDays % 3600) / 60);
	const secs = afterDays % 60;
	const pad = (n: number) => String(n).padStart(2, "0");
	const clock = `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
	if (years > 0) {
		return `${years}y ${days}d ${clock}`;
	}
	if (days > 0) {
		return `${days}d ${clock}`;
	}
	return clock;
}

export function formatPercent(value: number): string {
	if (!Number.isFinite(value) || value <= 0) {
		return "0%";
	}
	return `${(value * 100).toFixed(1)}%`;
}
