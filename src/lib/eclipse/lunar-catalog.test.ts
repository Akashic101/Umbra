import { describe, expect, it } from "vitest";
import { getLunarCatalogEntry, listLunarCatalog } from "./lunar-catalog";

describe("lunar catalog", () => {
	it("loads 1900–2100 Espenak events", () => {
		const catalog = listLunarCatalog();
		expect(catalog.length).toBe(459);
		expect(catalog[0]?.date).toBe("1900-06-13");
		expect(catalog.at(-1)?.date).toBe("2100-08-19");
	});

	it("derives P1/U1/U2/Max/U3/U4/P4 from half-durations", () => {
		const entry = getLunarCatalogEntry("2026-03-03");
		expect(entry.type).toBe("total");
		expect(entry.umbralMagnitude).toBeCloseTo(1.1507, 4);
		expect(entry.contacts.max).toBe("2026-03-03T11:33:37.000Z");
		const maxMs = Date.parse(entry.contacts.max ?? "");
		const halfTotMs = (58.3 / 2) * 60 * 1000;
		const halfParMs = (207.2 / 2) * 60 * 1000;
		const halfPenMs = (338.6 / 2) * 60 * 1000;
		expect(Date.parse(entry.contacts.u2 ?? "")).toBeCloseTo(
			maxMs - halfTotMs,
			0,
		);
		expect(Date.parse(entry.contacts.u3 ?? "")).toBeCloseTo(
			maxMs + halfTotMs,
			0,
		);
		expect(Date.parse(entry.contacts.u1 ?? "")).toBeCloseTo(
			maxMs - halfParMs,
			0,
		);
		expect(Date.parse(entry.contacts.u4 ?? "")).toBeCloseTo(
			maxMs + halfParMs,
			0,
		);
		expect(Date.parse(entry.contacts.p1 ?? "")).toBeCloseTo(
			maxMs - halfPenMs,
			0,
		);
		expect(Date.parse(entry.contacts.p4 ?? "")).toBeCloseTo(
			maxMs + halfPenMs,
			0,
		);
	});

	it("omits umbral contacts for penumbral eclipses", () => {
		const entry = getLunarCatalogEntry("1900-06-13");
		expect(entry.type).toBe("penumbral");
		expect(entry.contacts.u1).toBeNull();
		expect(entry.contacts.u2).toBeNull();
		expect(entry.contacts.p1).toBeTruthy();
		expect(entry.contacts.p4).toBeTruthy();
	});
});
