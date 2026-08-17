/**
 * Parse Espenak & Meeus Five Millennium Catalog of Lunar Eclipses
 * (NASA GSFC 5MKLEcatalog.txt) into a 1900–2100 JSON slice.
 *
 * Usage:
 *   npx tsx scripts/import-lunar-catalog.ts [path-or-url]
 *
 * Default source: https://eclipse.gsfc.nasa.gov/5MCLE/5MKLEcatalog.txt
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const YEAR_MIN = 1900;
const YEAR_MAX = 2100;
const DEFAULT_URL = "https://eclipse.gsfc.nasa.gov/5MCLE/5MKLEcatalog.txt";

const MONTHS: Record<string, number> = {
	Jan: 1,
	Feb: 2,
	Mar: 3,
	Apr: 4,
	May: 5,
	Jun: 6,
	Jul: 7,
	Aug: 8,
	Sep: 9,
	Oct: 10,
	Nov: 11,
	Dec: 12,
};

export type LunarCatalogJsonEntry = {
	date: string;
	td: string;
	deltaT: number;
	saros: number;
	type: "N" | "P" | "T";
	gamma: number;
	penMag: number;
	umMag: number;
	penMin: number | null;
	parMin: number | null;
	totMin: number | null;
	zenithLat: number;
	zenithLon: number;
};

const LINE_RE =
	/^(\d{5})\s+(-?\d{1,4})\s+([A-Za-z]{3})\s+(\d{1,2})\s+(\d{2}:\d{2}:\d{2})\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(\S+)\s+(\S+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\d+)([NS])\s+(\d+)([EW])\s*$/;

function parseDuration(token: string): number | null {
	if (token === "-" || token === "") {
		return null;
	}
	const value = Number(token);
	return Number.isFinite(value) && value > 0 ? value : null;
}

function parseType(raw: string): "N" | "P" | "T" | null {
	const letter = raw.charAt(0);
	if (letter === "N" || letter === "P" || letter === "T") {
		return letter;
	}
	return null;
}

export function parseCatalogLine(line: string): LunarCatalogJsonEntry | null {
	const match = LINE_RE.exec(line.trim());
	if (!match) {
		return null;
	}
	const year = Number(match[2]);
	const month = MONTHS[match[3]];
	const day = Number(match[4]);
	if (!month || year < YEAR_MIN || year > YEAR_MAX) {
		return null;
	}
	const type = parseType(match[9]);
	if (!type) {
		return null;
	}
	const latDeg = Number(match[17]);
	const lonDeg = Number(match[19]);
	const latSign = match[18] === "S" ? -1 : 1;
	const lonSign = match[20] === "W" ? -1 : 1;
	return {
		date: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
		td: match[5],
		deltaT: Number(match[6]),
		saros: Number(match[8]),
		type,
		gamma: Number(match[11]),
		penMag: Number(match[12]),
		umMag: Number(match[13]),
		penMin: parseDuration(match[14]),
		parMin: parseDuration(match[15]),
		totMin: parseDuration(match[16]),
		zenithLat: latSign * latDeg,
		zenithLon: lonSign * lonDeg,
	};
}

export function parseCatalogText(text: string): LunarCatalogJsonEntry[] {
	const entries: LunarCatalogJsonEntry[] = [];
	for (const line of text.split(/\r?\n/)) {
		const entry = parseCatalogLine(line);
		if (entry) {
			entries.push(entry);
		}
	}
	return entries;
}

async function loadSource(source: string): Promise<string> {
	if (/^https?:\/\//i.test(source)) {
		const response = await fetch(source);
		if (!response.ok) {
			throw new Error(
				`Failed to fetch catalog: ${response.status} ${response.statusText}`,
			);
		}
		return response.text();
	}
	return readFile(source, "utf8");
}

async function main(): Promise<void> {
	const here = path.dirname(fileURLToPath(import.meta.url));
	const repoRoot = path.resolve(here, "..");
	const localDefault = path.join(here, "data", "5MKLEcatalog.txt");
	const source = process.argv[2] ?? localDefault;
	let text: string;
	try {
		text = await loadSource(source);
	} catch (error) {
		if (source !== DEFAULT_URL && !process.argv[2]) {
			text = await loadSource(DEFAULT_URL);
		} else {
			throw error;
		}
	}
	const entries = parseCatalogText(text);
	if (entries.length < 400) {
		throw new Error(
			`Expected ~450 lunar eclipses for 1900–2100, got ${entries.length}`,
		);
	}
	const outDir = path.join(repoRoot, "src", "lib", "eclipse");
	await mkdir(outDir, { recursive: true });
	const outPath = path.join(outDir, "lunar-catalog.json");
	await writeFile(outPath, `${JSON.stringify(entries)}\n`);
	console.log(
		`Wrote ${entries.length} events to ${path.relative(repoRoot, outPath)}`,
	);
}

const isMain =
	fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "");

if (isMain) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	});
}
