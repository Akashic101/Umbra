export type EclipseType = "partial" | "total" | "annular" | "hybrid";

export type LocalEclipseType = "none" | "partial" | "total" | "annular";

export type ObserverLocation = {
	lat: number;
	lon: number;
	height: number;
	label: string;
};

export type Place = {
	lat: number;
	lon: number;
	label: string;
	bbox?: [number, number, number, number];
};

export type LatLon = {
	lat: number;
	lon: number;
};

export type EclipseFilters = {
	types: EclipseType[];
	visibleHere: boolean;
	yearFrom: number;
	yearTo: number;
	/** Inclusive ISO date floor (YYYY-MM-DD), or null. */
	dateFrom: string | null;
	/** Inclusive ISO date ceiling (YYYY-MM-DD), or null. */
	dateTo: string | null;
	minDurationSeconds: number;
	minCentralDurationSeconds: number;
	/** Minimum Sun-area obscuration at the selected location (0–1). */
	minObscuration: number;
};

export type CatalogEntry = {
	date: string;
	type: EclipseType;
	maxDurationSeconds: number;
	maxCentralDurationSeconds: number;
	greatestLat: number;
	greatestLon: number;
};

export type LocalSummary = {
	date: string;
	visible: boolean;
	localType: LocalEclipseType;
	obscuration: number;
	magnitude: number;
	durationSeconds: number;
	centralDurationSeconds: number;
};

export type ContactTimes = {
	c1: string | null;
	c2: string | null;
	max: string | null;
	c3: string | null;
	c4: string | null;
};

export type LocalCircumstances = LocalSummary & {
	moonSunRatio: number;
	contacts: ContactTimes;
};

export type EclipsePaths = {
	penumbra: LatLon[];
	umbra: LatLon[];
	centralLine: LatLon[];
};

export type PathStatus =
	| "inside_totality"
	| "inside_annularity"
	| "partial_only"
	| "outside";

export type AltitudeSample = {
	iso: string;
	altitudeDeg: number;
};

export type ObserverEclipseDetails = {
	date: string;
	location: ObserverLocation;
	pathStatus: PathStatus;
	localType: LocalEclipseType;
	sunriseIso: string | null;
	sunsetIso: string | null;
	lookDirection: string;
	lookAzimuthDeg: number | null;
	lookAltitudeDeg: number | null;
	/** Local umbra/antumbra path width in meters; 0 if partial/outside. */
	pathWidthMeters: number;
	altitudeSeries: AltitudeSample[];
	contacts: ContactTimes;
};

export type PersistedAppState = {
	location: ObserverLocation | null;
	selectedDate: string | null;
	filters: EclipseFilters;
};

/** Saved eclipse + observer location for quick details access. */
export type FavoriteEclipse = {
	id: string;
	date: string;
	location: ObserverLocation;
	savedAt: string;
};

export const CATALOG_YEAR_MIN = 1900;
export const CATALOG_YEAR_MAX = 2100;

export const ALL_ECLIPSE_TYPES: EclipseType[] = [
	"total",
	"annular",
	"hybrid",
	"partial",
];

export const DEFAULT_FILTERS: EclipseFilters = {
	types: [...ALL_ECLIPSE_TYPES],
	visibleHere: false,
	yearFrom: CATALOG_YEAR_MIN,
	yearTo: CATALOG_YEAR_MAX,
	dateFrom: null,
	dateTo: null,
	minDurationSeconds: 0,
	minCentralDurationSeconds: 0,
	minObscuration: 0,
};

/** Local calendar YYYY-MM-DD (not UTC). */
export function localIsoDate(date = new Date()): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}
