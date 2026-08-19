import { type FetchFn, type GetJsonOptions, getJson } from "./http";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
const HOURLY_VARS =
	"cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high";

export const FORECAST_HORIZON_DAYS = 16;
export const ARCHIVE_START_MS = Date.parse("1940-01-01T00:00:00Z");
/** ERA5 typically lags a few days; use the forecast API inside this window. */
export const ARCHIVE_LAG_MS = 5 * 24 * 60 * 60 * 1000;
export const MAX_HOUR_DELTA_MS = 90 * 60 * 1000;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type CloudMode =
	| "forecast"
	| "archive"
	| "too-far"
	| "too-old"
	| "empty";

export type CloudContactInput = {
	key: string;
	iso: string | null;
};

export type CloudLayerSample = {
	total: number;
	low: number | null;
	mid: number | null;
	high: number | null;
};

export type CloudContactSample = {
	key: string;
	iso: string;
	sample: CloudLayerSample | null;
};

export type CloudResult =
	| {
			status: "ok";
			source: "forecast" | "archive";
			samples: CloudContactSample[];
	  }
	| { status: "too-far"; availableFromDate: string }
	| { status: "too-old" }
	| { status: "unavailable" };

export type CloudService = {
	getAtContacts: (
		lat: number,
		lon: number,
		contacts: CloudContactInput[],
		options?: { nowMs?: number },
	) => Promise<CloudResult>;
};

export type CloudDeps = {
	getJson?: (url: string, options?: GetJsonOptions) => Promise<unknown>;
	fetch?: FetchFn;
};

type HourlyBlock = {
	time?: string[];
	cloud_cover?: Array<number | null>;
	cloud_cover_low?: Array<number | null>;
	cloud_cover_mid?: Array<number | null>;
	cloud_cover_high?: Array<number | null>;
};

type OpenMeteoCloudResponse = {
	hourly?: HourlyBlock;
};

type TimedContact = {
	key: string;
	iso: string;
	ms: number;
};

export function utcDateKey(ms: number): string {
	return new Date(ms).toISOString().slice(0, 10);
}

/** Open-Meteo hourly stamps are UTC without a trailing Z when timezone=UTC. */
export function parseOpenMeteoHour(stamp: string): number {
	if (!stamp) {
		return Number.NaN;
	}
	return Date.parse(stamp.endsWith("Z") ? stamp : `${stamp}Z`);
}

export function nearestHourIndex(
	hoursMs: number[],
	targetMs: number,
	maxDeltaMs = MAX_HOUR_DELTA_MS,
): number | null {
	let best = -1;
	let bestDelta = Number.POSITIVE_INFINITY;
	for (let i = 0; i < hoursMs.length; i++) {
		const hourMs = hoursMs[i];
		if (hourMs === undefined || !Number.isFinite(hourMs)) {
			continue;
		}
		const delta = Math.abs(hourMs - targetMs);
		if (delta < bestDelta) {
			bestDelta = delta;
			best = i;
		}
	}
	if (best < 0 || bestDelta > maxDeltaMs) {
		return null;
	}
	return best;
}

export function classifyCloudRequest(
	minMs: number,
	maxMs: number,
	nowMs: number,
): CloudMode {
	if (!Number.isFinite(minMs) || !Number.isFinite(maxMs)) {
		return "empty";
	}
	const forecastEnd = nowMs + FORECAST_HORIZON_DAYS * MS_PER_DAY;
	if (minMs > forecastEnd) {
		return "too-far";
	}
	if (minMs < ARCHIVE_START_MS) {
		return "too-old";
	}
	if (maxMs >= nowMs - ARCHIVE_LAG_MS) {
		return "forecast";
	}
	return "archive";
}

export function forecastAvailableFromDate(eventMinMs: number): string {
	return utcDateKey(eventMinMs - FORECAST_HORIZON_DAYS * MS_PER_DAY);
}

function finitePercent(value: number | null | undefined): number | null {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return null;
	}
	return Math.min(100, Math.max(0, value));
}

export function mapHourlyToContacts(
	hourly: HourlyBlock,
	contacts: TimedContact[],
): CloudContactSample[] {
	const times = hourly.time ?? [];
	const hoursMs = times.map(parseOpenMeteoHour);
	const totals = hourly.cloud_cover ?? [];
	const lows = hourly.cloud_cover_low ?? [];
	const mids = hourly.cloud_cover_mid ?? [];
	const highs = hourly.cloud_cover_high ?? [];

	return contacts.map((contact) => {
		const index = nearestHourIndex(hoursMs, contact.ms);
		if (index === null) {
			return { key: contact.key, iso: contact.iso, sample: null };
		}
		const total = finitePercent(totals[index]);
		if (total === null) {
			return { key: contact.key, iso: contact.iso, sample: null };
		}
		return {
			key: contact.key,
			iso: contact.iso,
			sample: {
				total,
				low: finitePercent(lows[index]),
				mid: finitePercent(mids[index]),
				high: finitePercent(highs[index]),
			},
		};
	});
}

function timedContacts(contacts: CloudContactInput[]): TimedContact[] {
	const out: TimedContact[] = [];
	for (const contact of contacts) {
		if (!contact.iso) {
			continue;
		}
		const ms = Date.parse(contact.iso);
		if (!Number.isFinite(ms)) {
			continue;
		}
		out.push({ key: contact.key, iso: contact.iso, ms });
	}
	return out;
}

/**
 * Open-Meteo hourly cloud cover (forecast ~16 days; ERA5 archive from 1940).
 * CORS-enabled; no API key. Errors become "unavailable".
 */
export function createCloudService(deps: CloudDeps = {}): CloudService {
	const requestJson = deps.getJson ?? getJson;
	const fetchFn = deps.fetch;
	const cache = new Map<string, CloudResult>();

	return {
		async getAtContacts(
			lat: number,
			lon: number,
			contacts: CloudContactInput[],
			options: { nowMs?: number } = {},
		): Promise<CloudResult> {
			if (
				!Number.isFinite(lat) ||
				!Number.isFinite(lon) ||
				Math.abs(lat) > 90 ||
				Math.abs(lon) > 180
			) {
				return { status: "unavailable" };
			}

			const timed = timedContacts(contacts);
			if (timed.length === 0) {
				return { status: "unavailable" };
			}

			const nowMs = options.nowMs ?? Date.now();
			let minMs = Number.POSITIVE_INFINITY;
			let maxMs = Number.NEGATIVE_INFINITY;
			for (const contact of timed) {
				minMs = Math.min(minMs, contact.ms);
				maxMs = Math.max(maxMs, contact.ms);
			}

			const mode = classifyCloudRequest(minMs, maxMs, nowMs);
			if (mode === "too-far") {
				return {
					status: "too-far",
					availableFromDate: forecastAvailableFromDate(minMs),
				};
			}
			if (mode === "too-old") {
				return { status: "too-old" };
			}

			const startDate = utcDateKey(minMs);
			const endDate = utcDateKey(maxMs);
			const cacheKey = [
				lat.toFixed(3),
				lon.toFixed(3),
				mode,
				startDate,
				endDate,
				timed.map((c) => `${c.key}:${c.iso}`).join(","),
			].join("|");
			const cached = cache.get(cacheKey);
			if (cached) {
				return cached;
			}

			const url = new URL(mode === "archive" ? ARCHIVE_URL : FORECAST_URL);
			url.searchParams.set("latitude", String(lat));
			url.searchParams.set("longitude", String(lon));
			url.searchParams.set("hourly", HOURLY_VARS);
			url.searchParams.set("start_date", startDate);
			url.searchParams.set("end_date", endDate);
			url.searchParams.set("timezone", "UTC");

			try {
				const data = (await requestJson(url.toString(), {
					fetch: fetchFn,
					timeoutMs: 8_000,
				})) as OpenMeteoCloudResponse;
				const hourly = data.hourly;
				if (!hourly?.time?.length) {
					return { status: "unavailable" };
				}
				const result: CloudResult = {
					status: "ok",
					source: mode,
					samples: mapHourlyToContacts(hourly, timed),
				};
				cache.set(cacheKey, result);
				return result;
			} catch {
				return { status: "unavailable" };
			}
		},
	};
}

export const clouds = createCloudService();
