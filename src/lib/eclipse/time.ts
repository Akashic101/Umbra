import { m } from "$lib/paraglide/messages.js";
import { getLocale } from "$lib/paraglide/runtime";

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
		return m.emDash();
	}
	const date = new Date(iso);
	const formatter = new Intl.DateTimeFormat(getLocale(), {
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
		return m.emDash();
	}
	const timeZone = options.timeZone ?? deviceTimeZone();
	const date = new Date(iso);
	const formatter = new Intl.DateTimeFormat(getLocale(), {
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

/**
 * Format a catalog/calendar date (YYYY-MM-DD) for display in the active locale.
 * Parsed as a civil date (not UTC midnight) so the day never shifts by timezone.
 */
export function formatIsoDate(isoDate: string | null | undefined): string {
	if (!isoDate) {
		return m.emDash();
	}
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
	if (!match) {
		return isoDate;
	}
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(year, month - 1, day);
	return new Intl.DateTimeFormat(getLocale(), { dateStyle: "medium" }).format(
		date,
	);
}

export function formatDuration(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds <= 0) {
		return m.emDash();
	}
	const total = Math.round(seconds);
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const secs = total % 60;
	if (hours > 0) {
		return m.durationHms({ hours, minutes, seconds: secs });
	}
	if (minutes > 0) {
		return m.durationMs({ minutes, seconds: secs });
	}
	return m.durationS({ seconds: secs });
}

/** Live countdown: years, days, and HH:MM:SS (no fractional seconds). */
export function formatCountdown(ms: number): string {
	if (!Number.isFinite(ms) || ms < 0) {
		return m.emDash();
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
		return m.countdownYd({ years, days, clock });
	}
	if (days > 0) {
		return m.countdownD({ days, clock });
	}
	return clock;
}

export function formatPercent(value: number): string {
	if (!Number.isFinite(value) || value <= 0) {
		return m.percentZero();
	}
	return m.percent({ value: (value * 100).toFixed(1) });
}

/** Signed eclipse magnitude (lunar umbral/penumbral; may exceed 1). */
export function formatMagnitude(value: number): string {
	if (!Number.isFinite(value)) {
		return m.emDash();
	}
	return value.toFixed(3);
}
