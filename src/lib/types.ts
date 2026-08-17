export type AppEclipseKind = "solar" | "lunar";

export type EclipseType = "partial" | "total" | "annular" | "hybrid";

export type LunarEclipseType = "penumbral" | "partial" | "total";

export type LunarLocalType = LunarEclipseType | "none";

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

/** Time series sample from C1→C4 (altitude chart accepts `{ iso, altitudeDeg }`). */
export type CircumstanceSample = {
	iso: string;
	altitudeDeg: number;
	azimuthDeg: number;
	obscuration: number;
	magnitude: number;
	moonSunRatio: number;
	/** Instantaneous local type at this sample (drives coverage disk while scrubbing). */
	localType: LocalEclipseType;
	/**
	 * Position angle of the Moon’s center relative to the Sun’s center, degrees,
	 * counter-clockwise from celestial north (derived from local u,v).
	 */
	moonPaDeg: number;
};

export type DaylightPhase = "day" | "night" | "unknown";

/** Worker payload: labels are built in the UI so they can be localized. */
export type ContactDaylight = {
	key: "c1" | "c2" | "max" | "c3" | "c4";
	phase: DaylightPhase;
};

export type GlobalEclipseFacts = {
	type: EclipseType;
	saros: number;
	gamma: number;
	maxMagnitude: number;
	maxObscuration: number;
	maxMoonSunRatio: number;
	maxDurationSeconds: number;
	maxCentralDurationSeconds: number;
	pathWidthMeters: number;
	greatestLat: number;
	greatestLon: number;
	greatestIso: string;
};

export type ObserverEclipseDetails = {
	date: string;
	location: ObserverLocation;
	visible: boolean;
	pathStatus: PathStatus;
	localType: LocalEclipseType;
	obscuration: number;
	magnitude: number;
	moonSunRatio: number;
	durationSeconds: number;
	centralDurationSeconds: number;
	sunriseIso: string | null;
	sunsetIso: string | null;
	/** Compass code such as "WNW"; the UI turns it into a localized name. */
	lookDirectionCode: string | null;
	lookAzimuthDeg: number | null;
	lookAltitudeDeg: number | null;
	/** Local umbra/antumbra path width in meters; 0 if partial/outside. */
	pathWidthMeters: number;
	series: CircumstanceSample[];
	contactDaylight: ContactDaylight[];
	global: GlobalEclipseFacts | null;
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

export const ALL_LUNAR_ECLIPSE_TYPES: LunarEclipseType[] = [
	"penumbral",
	"partial",
	"total",
];

export type LunarEclipseFilters = {
	types: LunarEclipseType[];
	visibleHere: boolean;
	yearFrom: number;
	yearTo: number;
	dateFrom: string | null;
	dateTo: string | null;
	minUmbralDurationSeconds: number;
	minUmbralMagnitude: number;
};

export const DEFAULT_LUNAR_FILTERS: LunarEclipseFilters = {
	types: [...ALL_LUNAR_ECLIPSE_TYPES],
	visibleHere: false,
	yearFrom: CATALOG_YEAR_MIN,
	yearTo: CATALOG_YEAR_MAX,
	dateFrom: null,
	dateTo: null,
	minUmbralDurationSeconds: 0,
	minUmbralMagnitude: 0,
};

export type LunarContactKey = "p1" | "u1" | "u2" | "max" | "u3" | "u4" | "p4";

export type LunarContactTimes = {
	p1: string | null;
	u1: string | null;
	u2: string | null;
	max: string | null;
	u3: string | null;
	u4: string | null;
	p4: string | null;
};

export type LunarCatalogEntry = {
	date: string;
	type: LunarEclipseType;
	saros: number;
	gamma: number;
	penumbralMagnitude: number;
	umbralMagnitude: number;
	penumbralDurationSeconds: number;
	umbralDurationSeconds: number;
	totalDurationSeconds: number;
	zenithLat: number;
	zenithLon: number;
	greatestIso: string;
	contacts: LunarContactTimes;
};

export type LunarLocalSummary = {
	date: string;
	visible: boolean;
	localType: LunarLocalType;
	penumbralMagnitude: number;
	umbralMagnitude: number;
	durationSeconds: number;
	umbralDurationSeconds: number;
	totalDurationSeconds: number;
};

export type LunarLocalCircumstances = LunarLocalSummary & {
	contacts: LunarContactTimes;
};

export type LunarCircumstanceSample = {
	iso: string;
	altitudeDeg: number;
	azimuthDeg: number;
	umbralMagnitude: number;
	penumbralMagnitude: number;
	localType: LunarLocalType;
};

export type LunarContactMoon = {
	key: LunarContactKey;
	moonUp: boolean;
};

export type LunarGlobalFacts = {
	type: LunarEclipseType;
	saros: number;
	gamma: number;
	penumbralMagnitude: number;
	umbralMagnitude: number;
	penumbralDurationSeconds: number;
	umbralDurationSeconds: number;
	totalDurationSeconds: number;
	zenithLat: number;
	zenithLon: number;
	greatestIso: string;
};

export type LunarObserverDetails = {
	date: string;
	location: ObserverLocation;
	visible: boolean;
	localType: LunarLocalType;
	penumbralMagnitude: number;
	umbralMagnitude: number;
	durationSeconds: number;
	umbralDurationSeconds: number;
	totalDurationSeconds: number;
	moonriseIso: string | null;
	moonsetIso: string | null;
	lookDirectionCode: string | null;
	lookAzimuthDeg: number | null;
	lookAltitudeDeg: number | null;
	series: LunarCircumstanceSample[];
	contactMoon: LunarContactMoon[];
	global: LunarGlobalFacts;
	contacts: LunarContactTimes;
};

export type PersistedLunarState = {
	selectedDate: string | null;
	filters: LunarEclipseFilters;
};

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
