import { describe, expect, it } from "vitest";
import { createElevationService } from "./elevation";

describe("createElevationService", () => {
	it("returns null for invalid coordinates", async () => {
		const service = createElevationService();
		await expect(service.getMeters(Number.NaN, 11)).resolves.toBeNull();
		await expect(
			service.getMetersMany([{ lat: 91, lon: 0 }, { lat: 0, lon: 181 }]),
		).resolves.toEqual([null, null]);
	});

	it("returns elevation values from the API", async () => {
		const service = createElevationService({
			getJson: async () => ({ elevation: [520, 34] }),
		});
		await expect(service.getMeters(48.137, 11.576)).resolves.toBe(520);
		await expect(
			service.getMetersMany([
				{ lat: 48.137, lon: 11.576 },
				{ lat: 52.52, lon: 13.405 },
			]),
		).resolves.toEqual([520, 34]);
	});

	it("returns null when the API fails or returns invalid data", async () => {
		const service = createElevationService({
			getJson: async () => {
				throw new Error("network");
			},
		});
		await expect(service.getMeters(48.137, 11.576)).resolves.toBeNull();
		const invalid = createElevationService({
			getJson: async () => ({ elevation: [Number.NaN] }),
		});
		await expect(invalid.getMeters(48.137, 11.576)).resolves.toBeNull();
	});

	it("batches large point lists", async () => {
		const chunks: number[] = [];
		const service = createElevationService({
			getJson: async (url) => {
				const params = new URL(url).searchParams.get("latitude") ?? "";
				chunks.push(params.split(",").length);
				return {
					elevation: Array.from({ length: params.split(",").length }, () => 1),
				};
			},
		});
		const points = Array.from({ length: 85 }, (_, index) => ({
			lat: index,
			lon: index,
		}));
		const result = await service.getMetersMany(points);
		expect(result).toHaveLength(85);
		expect(chunks).toEqual([80, 5]);
	});

	it("returns an empty array for no points", async () => {
		const service = createElevationService();
		await expect(service.getMetersMany([])).resolves.toEqual([]);
	});
});
