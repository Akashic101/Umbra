import { describe, expect, it, vi } from "vitest";
import {
	createGeocodingService,
	formatCoordinates,
} from "./geocoding";

describe("formatCoordinates", () => {
	it("formats northern and eastern hemispheres", () => {
		expect(formatCoordinates(48.137, 11.576)).toBe("48.1370° N, 11.5760° E");
	});

	it("formats southern and western hemispheres", () => {
		expect(formatCoordinates(-33.8688, -151.2093)).toBe(
			"33.8688° S, 151.2093° W",
		);
	});
});

describe("createGeocodingService", () => {
	it("returns an empty list for blank queries", async () => {
		const service = createGeocodingService();
		await expect(service.search("   ")).resolves.toEqual([]);
	});

	it("maps search hits to places", async () => {
		let now = 0;
		const service = createGeocodingService({
			now: () => now,
			sleep: async () => {},
			getJson: async () => [
				{
					lat: "48.137",
					lon: "11.576",
					display_name: "Munich, Germany",
					boundingbox: ["48.0", "48.2", "11.4", "11.7"],
				},
				{
					lat: "52.52",
					lon: "13.405",
					display_name: "",
				},
			],
		});
		const places = await service.search("Munich");
		expect(places[0]).toEqual({
			lat: 48.137,
			lon: 11.576,
			label: "Munich, Germany",
			bbox: [11.4, 48.0, 11.7, 48.2],
		});
		expect(places[1]?.label).toBe("52.5200° N, 13.4050° E");
		now = 500;
		await service.search("Berlin");
	});

	it("throttles repeated requests", async () => {
		let now = 0;
		const sleeps: number[] = [];
		const service = createGeocodingService({
			now: () => now,
			sleep: async (ms) => {
				sleeps.push(ms);
			},
			getJson: async () => [],
		});
		await service.search("one");
		now = 100;
		await service.search("two");
		expect(sleeps.at(-1)).toBe(1000);
	});

	it("reverse geocodes successful hits", async () => {
		const service = createGeocodingService({
			sleep: async () => {},
			getJson: async () => ({
				lat: "48.137",
				lon: "11.576",
				display_name: "Munich",
			}),
		});
		await expect(service.reverse(48.137, 11.576)).resolves.toEqual({
			lat: 48.137,
			lon: 11.576,
			label: "Munich",
		});
	});

	it("falls back to coordinates when reverse lookup fails", async () => {
		const service = createGeocodingService({
			sleep: async () => {},
			getJson: async () => ({ error: "Unable to geocode" }),
		});
		await expect(service.reverse(48.137, 11.576)).resolves.toEqual({
			lat: 48.137,
			lon: 11.576,
			label: "48.1370° N, 11.5760° E",
		});
	});
});

describe("geocoding export", () => {
	it("uses the Tauri HTTP plugin when running in Tauri", async () => {
		vi.resetModules();
		vi.doMock("$lib/env/tauri", () => ({
			isTauri: () => true,
			UMBRA_USER_AGENT: "Umbra/test",
		}));
		vi.doMock("@tauri-apps/plugin-http", () => ({
			fetch: vi.fn(async () => new Response(JSON.stringify([]))),
		}));
		const { geocoding: tauriGeocoding } = await import("./geocoding");
		await expect(tauriGeocoding.search("Munich")).resolves.toEqual([]);
		vi.resetModules();
	});

	it("uses global fetch outside Tauri and sets Accept when missing", async () => {
		vi.resetModules();
		vi.doMock("$lib/env/tauri", () => ({
			isTauri: () => false,
			UMBRA_USER_AGENT: "Umbra/test",
		}));
		vi.doMock("./http", () => ({
			getJson: async (
				url: string,
				options: { fetch?: typeof fetch },
			) => {
				const response = await options.fetch!(url);
				return response.json();
			},
		}));
		const fetchMock = vi.fn(async (_input, init) => {
			expect(new Headers(init?.headers).get("Accept")).toBe("application/json");
			return new Response(JSON.stringify([]));
		});
		vi.stubGlobal("fetch", fetchMock);
		const { geocoding: browserGeocoding } = await import("./geocoding");
		await expect(browserGeocoding.search("Munich")).resolves.toEqual([]);
		vi.unstubAllGlobals();
		vi.resetModules();
	});

	it("preserves an existing Accept header on fetch", async () => {
		vi.resetModules();
		vi.doMock("$lib/env/tauri", () => ({
			isTauri: () => false,
			UMBRA_USER_AGENT: "Umbra/test",
		}));
		vi.doMock("./http", () => ({
			getJson: async (
				url: string,
				options: { fetch?: typeof fetch },
			) => {
				const response = await options.fetch!(url, {
					headers: { Accept: "application/custom" },
				});
				return response.json();
			},
		}));
		const fetchMock = vi.fn(async (_input, init) => {
			expect(new Headers(init?.headers).get("Accept")).toBe(
				"application/custom",
			);
			return new Response(JSON.stringify([]));
		});
		vi.stubGlobal("fetch", fetchMock);
		const { geocoding: browserGeocoding } = await import("./geocoding");
		await expect(browserGeocoding.search("Munich")).resolves.toEqual([]);
		vi.unstubAllGlobals();
		vi.resetModules();
	});
});

describe("default geocoding throttle sleep", () => {
	it("waits between requests using the built-in sleep", async () => {
		vi.useFakeTimers();
		let now = 0;
		const service = createGeocodingService({
			now: () => now,
			getJson: async () => [],
		});
		const first = service.search("one");
		await vi.runAllTimersAsync();
		await first;
		now = 100;
		const second = service.search("two");
		await vi.runAllTimersAsync();
		await second;
		expect(second).toBeDefined();
		vi.useRealTimers();
	});
});
