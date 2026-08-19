import { describe, expect, it } from "vitest";
import {
	classifyCloudRequest,
	createCloudService,
	forecastAvailableFromDate,
	mapHourlyToContacts,
	nearestHourIndex,
	parseOpenMeteoHour,
	utcDateKey,
} from "./clouds";

const NOW = Date.parse("2026-08-17T16:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

describe("classifyCloudRequest", () => {
	it("uses forecast for events within 16 days", () => {
		const min = NOW + 5 * DAY;
		expect(classifyCloudRequest(min, min + 3 * 3600_000, NOW)).toBe("forecast");
	});

	it("uses forecast for live and recent events inside the ERA5 lag", () => {
		const max = NOW - 2 * DAY;
		const min = max - 3 * 3600_000;
		expect(classifyCloudRequest(min, max, NOW)).toBe("forecast");
	});

	it("uses archive for events older than the ERA5 lag", () => {
		const max = NOW - 10 * DAY;
		const min = max - 3 * 3600_000;
		expect(classifyCloudRequest(min, max, NOW)).toBe("archive");
	});

	it("returns too-far beyond the forecast horizon", () => {
		const min = NOW + 20 * DAY;
		expect(classifyCloudRequest(min, min + 3600_000, NOW)).toBe("too-far");
	});

	it("returns too-old before 1940", () => {
		const min = Date.parse("1939-06-01T00:00:00Z");
		expect(classifyCloudRequest(min, min + 3600_000, NOW)).toBe("too-old");
	});

	it("returns empty for invalid times", () => {
		expect(classifyCloudRequest(Number.NaN, NOW, NOW)).toBe("empty");
	});
});

describe("nearestHourIndex", () => {
	const hours = [
		Date.parse("2026-08-20T14:00:00Z"),
		Date.parse("2026-08-20T15:00:00Z"),
		Date.parse("2026-08-20T16:00:00Z"),
	];

	it("picks the closest hour", () => {
		expect(nearestHourIndex(hours, Date.parse("2026-08-20T15:17:00Z"))).toBe(1);
		expect(nearestHourIndex(hours, Date.parse("2026-08-20T15:50:00Z"))).toBe(2);
	});

	it("returns null when farther than 90 minutes", () => {
		expect(nearestHourIndex(hours, Date.parse("2026-08-20T18:00:00Z"))).toBe(
			null,
		);
	});

	it("returns null for an empty series", () => {
		expect(nearestHourIndex([], Date.parse("2026-08-20T15:00:00Z"))).toBe(null);
	});

	it("skips invalid hour timestamps", () => {
		expect(
			nearestHourIndex(
				[Number.NaN, Date.parse("2026-08-20T15:00:00Z")],
				Date.parse("2026-08-20T15:10:00Z"),
			),
		).toBe(1);
	});
});

describe("open-meteo hour stamps", () => {
	it("parses timezone=UTC stamps as UTC", () => {
		expect(parseOpenMeteoHour("2026-08-20T14:00")).toBe(
			Date.parse("2026-08-20T14:00:00Z"),
		);
		expect(parseOpenMeteoHour("2026-08-20T14:00:00Z")).toBe(
			Date.parse("2026-08-20T14:00:00Z"),
		);
	});

	it("formats UTC calendar dates", () => {
		expect(utcDateKey(Date.parse("2026-08-20T01:30:00Z"))).toBe("2026-08-20");
		expect(forecastAvailableFromDate(Date.parse("2026-09-10T12:00:00Z"))).toBe(
			"2026-08-25",
		);
	});

	it("returns NaN for empty hour stamps", () => {
		expect(parseOpenMeteoHour("")).toBeNaN();
	});
});

describe("mapHourlyToContacts", () => {
	it("attaches nearest-hour layers", () => {
		const samples = mapHourlyToContacts(
			{
				time: ["2026-08-20T14:00", "2026-08-20T15:00"],
				cloud_cover: [10, 40],
				cloud_cover_low: [4, 20],
				cloud_cover_mid: [3, 12],
				cloud_cover_high: [2, 8],
			},
			[
				{
					key: "c1",
					iso: "2026-08-20T14:07:00Z",
					ms: Date.parse("2026-08-20T14:07:00Z"),
				},
				{
					key: "max",
					iso: "2026-08-20T15:10:00Z",
					ms: Date.parse("2026-08-20T15:10:00Z"),
				},
			],
		);
		expect(samples[0]?.sample).toEqual({
			total: 10,
			low: 4,
			mid: 3,
			high: 2,
		});
		expect(samples[1]?.sample?.total).toBe(40);
	});

	it("returns null samples when no hour matches or totals are invalid", () => {
		const samples = mapHourlyToContacts(
			{
				time: ["2026-08-20T14:00"],
				cloud_cover: [null],
			},
			[
				{
					key: "far",
					iso: "2026-08-20T20:00:00Z",
					ms: Date.parse("2026-08-20T20:00:00Z"),
				},
				{
					key: "bad-total",
					iso: "2026-08-20T14:07:00Z",
					ms: Date.parse("2026-08-20T14:07:00Z"),
				},
			],
		);
		expect(samples[0]?.sample).toBeNull();
		expect(samples[1]?.sample).toBeNull();
	});

	it("clamps cloud layer percentages", () => {
		const samples = mapHourlyToContacts(
			{
				time: ["2026-08-20T14:00"],
				cloud_cover: [150],
				cloud_cover_low: [-5],
				cloud_cover_mid: [Number.NaN],
				cloud_cover_high: [20],
			},
			[
				{
					key: "c1",
					iso: "2026-08-20T14:07:00Z",
					ms: Date.parse("2026-08-20T14:07:00Z"),
				},
			],
		);
		expect(samples[0]?.sample).toEqual({
			total: 100,
			low: 0,
			mid: null,
			high: 20,
		});
	});

	it("handles missing hourly arrays", () => {
		const samples = mapHourlyToContacts({}, [
			{
				key: "c1",
				iso: "2026-08-20T14:07:00Z",
				ms: Date.parse("2026-08-20T14:07:00Z"),
			},
		]);
		expect(samples[0]?.sample).toBeNull();
	});
});

describe("createCloudService", () => {
	it("does not fetch when the event is too far ahead", async () => {
		let called = 0;
		const service = createCloudService({
			getJson: async () => {
				called += 1;
				return {};
			},
		});
		const result = await service.getAtContacts(
			48.14,
			11.58,
			[{ key: "max", iso: "2027-08-02T10:00:00Z" }],
			{ nowMs: NOW },
		);
		expect(result.status).toBe("too-far");
		if (result.status === "too-far") {
			expect(result.availableFromDate).toBe("2027-07-17");
		}
		expect(called).toBe(0);
	});

	it("requests forecast hourly cloud cover for upcoming contacts", async () => {
		const urls: string[] = [];
		const service = createCloudService({
			getJson: async (url) => {
				urls.push(url);
				return {
					hourly: {
						time: ["2026-08-20T14:00"],
						cloud_cover: [18],
						cloud_cover_low: [6],
						cloud_cover_mid: [7],
						cloud_cover_high: [5],
					},
				};
			},
		});
		const result = await service.getAtContacts(
			48.14,
			11.58,
			[{ key: "max", iso: "2026-08-20T14:07:00Z" }],
			{ nowMs: NOW },
		);
		expect(result.status).toBe("ok");
		if (result.status === "ok") {
			expect(result.source).toBe("forecast");
			expect(result.samples[0]?.sample?.total).toBe(18);
		}
		expect(urls[0]).toContain("api.open-meteo.com/v1/forecast");
		expect(urls[0]).toContain("hourly=cloud_cover");
		expect(urls[0]).toContain("timezone=UTC");
	});

	it("requests the ERA5 archive for older events", async () => {
		const urls: string[] = [];
		const service = createCloudService({
			getJson: async (url) => {
				urls.push(url);
				return {
					hourly: {
						time: ["2024-04-08T18:00"],
						cloud_cover: [55],
						cloud_cover_low: [10],
						cloud_cover_mid: [20],
						cloud_cover_high: [25],
					},
				};
			},
		});
		const result = await service.getAtContacts(
			48.14,
			11.58,
			[{ key: "max", iso: "2024-04-08T18:20:00Z" }],
			{ nowMs: NOW },
		);
		expect(result.status).toBe("ok");
		if (result.status === "ok") {
			expect(result.source).toBe("archive");
			expect(result.samples[0]?.sample?.total).toBe(55);
		}
		expect(urls[0]).toContain("archive-api.open-meteo.com/v1/archive");
	});

	it("returns unavailable when the request fails", async () => {
		const service = createCloudService({
			getJson: async () => {
				throw new Error("network");
			},
		});
		const result = await service.getAtContacts(
			48.14,
			11.58,
			[{ key: "max", iso: "2026-08-20T14:07:00Z" }],
			{ nowMs: NOW },
		);
		expect(result).toEqual({ status: "unavailable" });
	});

	it("returns unavailable for invalid coordinates or empty contacts", async () => {
		const service = createCloudService({
			getJson: async () => ({}),
		});
		await expect(
			service.getAtContacts(Number.NaN, 11, [{ key: "c1", iso: "2026-08-20T14:07:00Z" }], {
				nowMs: NOW,
			}),
		).resolves.toEqual({ status: "unavailable" });
		await expect(
			service.getAtContacts(48.14, 200, [{ key: "c1", iso: "2026-08-20T14:07:00Z" }], {
				nowMs: NOW,
			}),
		).resolves.toEqual({ status: "unavailable" });
		await expect(
			service.getAtContacts(48.14, 11.58, [{ key: "c1", iso: null }], { nowMs: NOW }),
		).resolves.toEqual({ status: "unavailable" });
	});

	it("skips invalid contact timestamps while fetching valid ones", async () => {
		const service = createCloudService({
			getJson: async () => ({
				hourly: {
					time: ["2026-08-20T14:00"],
					cloud_cover: [18],
				},
			}),
		});
		await expect(
			service.getAtContacts(
				48.14,
				11.58,
				[
					{ key: "bad", iso: "not-a-date" },
					{ key: "max", iso: "2026-08-20T14:07:00Z" },
				],
				{ nowMs: NOW },
			),
		).resolves.toMatchObject({ status: "ok" });
	});

	it("returns too-old for pre-1940 events", async () => {
		const service = createCloudService({
			getJson: async () => ({}),
		});
		await expect(
			service.getAtContacts(
				48.14,
				11.58,
				[{ key: "c1", iso: "1939-06-01T12:00:00Z" }],
				{ nowMs: NOW },
			),
		).resolves.toEqual({ status: "too-old" });
	});

	it("returns unavailable when the API returns no hourly data", async () => {
		const service = createCloudService({
			getJson: async () => ({ hourly: { time: [] } }),
		});
		await expect(
			service.getAtContacts(
				48.14,
				11.58,
				[{ key: "max", iso: "2026-08-20T14:07:00Z" }],
				{ nowMs: NOW },
			),
		).resolves.toEqual({ status: "unavailable" });
	});

	it("reuses cached responses for identical requests", async () => {
		let calls = 0;
		const service = createCloudService({
			getJson: async () => {
				calls += 1;
				return {
					hourly: {
						time: ["2026-08-20T14:00"],
						cloud_cover: [18],
					},
				};
			},
		});
		const contacts = [{ key: "max", iso: "2026-08-20T14:07:00Z" }];
		await service.getAtContacts(48.14, 11.58, contacts, { nowMs: NOW });
		await service.getAtContacts(48.14, 11.58, contacts, { nowMs: NOW });
		expect(calls).toBe(1);
	});

	it("uses the current time when nowMs is omitted", async () => {
		const service = createCloudService({
			getJson: async () => ({
				hourly: {
					time: [new Date().toISOString().slice(0, 13).replace("T", "T") + ":00"],
					cloud_cover: [12],
				},
			}),
		});
		const soon = new Date(Date.now() + 2 * DAY).toISOString();
		const result = await service.getAtContacts(48.14, 11.58, [
			{ key: "max", iso: soon },
		]);
		expect(result.status).toBe("ok");
	});
});
