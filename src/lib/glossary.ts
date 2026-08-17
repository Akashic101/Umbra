import { m } from "$lib/paraglide/messages.js";

export type GlossaryEntry = {
	id: string;
	term: string;
	definition: string;
};

/** Localized dictionary entries. Call from a `$derived` so locale changes refresh terms. */
export function listGlossary(): GlossaryEntry[] {
	return [
		{
			id: "altitude",
			term: m.dictTermAltitude(),
			definition: m.dictDefAltitude(),
		},
		{
			id: "annular",
			term: m.dictTermAnnular(),
			definition: m.dictDefAnnular(),
		},
		{
			id: "annularity",
			term: m.dictTermAnnularity(),
			definition: m.dictDefAnnularity(),
		},
		{
			id: "antumbra",
			term: m.dictTermAntumbra(),
			definition: m.dictDefAntumbra(),
		},
		{
			id: "apparent",
			term: m.dictTermApparent(),
			definition: m.dictDefApparent(),
		},
		{
			id: "azimuth",
			term: m.dictTermAzimuth(),
			definition: m.dictDefAzimuth(),
		},
		{
			id: "besselian",
			term: m.dictTermBesselian(),
			definition: m.dictDefBesselian(),
		},
		{ id: "c1", term: m.dictTermC1(), definition: m.dictDefC1() },
		{ id: "c2", term: m.dictTermC2(), definition: m.dictDefC2() },
		{ id: "c3", term: m.dictTermC3(), definition: m.dictDefC3() },
		{ id: "c4", term: m.dictTermC4(), definition: m.dictDefC4() },
		{
			id: "catalog",
			term: m.dictTermCatalog(),
			definition: m.dictDefCatalog(),
		},
		{
			id: "central",
			term: m.dictTermCentral(),
			definition: m.dictDefCentral(),
		},
		{
			id: "centerline",
			term: m.dictTermCenterline(),
			definition: m.dictDefCenterline(),
		},
		{
			id: "circumstances",
			term: m.dictTermCircumstances(),
			definition: m.dictDefCircumstances(),
		},
		{
			id: "contact",
			term: m.dictTermContact(),
			definition: m.dictDefContact(),
		},
		{
			id: "coordinates",
			term: m.dictTermCoordinates(),
			definition: m.dictDefCoordinates(),
		},
		{
			id: "coverage",
			term: m.dictTermCoverage(),
			definition: m.dictDefCoverage(),
		},
		{
			id: "duration",
			term: m.dictTermDuration(),
			definition: m.dictDefDuration(),
		},
		{
			id: "eclipse",
			term: m.dictTermEclipse(),
			definition: m.dictDefEclipse(),
		},
		{ id: "egress", term: m.dictTermEgress(), definition: m.dictDefEgress() },
		{
			id: "elevation",
			term: m.dictTermElevation(),
			definition: m.dictDefElevation(),
		},
		{ id: "gamma", term: m.dictTermGamma(), definition: m.dictDefGamma() },
		{
			id: "greatest",
			term: m.dictTermGreatest(),
			definition: m.dictDefGreatest(),
		},
		{
			id: "horizon",
			term: m.dictTermHorizon(),
			definition: m.dictDefHorizon(),
		},
		{ id: "hybrid", term: m.dictTermHybrid(), definition: m.dictDefHybrid() },
		{
			id: "ingress",
			term: m.dictTermIngress(),
			definition: m.dictDefIngress(),
		},
		{
			id: "lunarEclipse",
			term: m.dictTermLunarEclipse(),
			definition: m.dictDefLunarEclipse(),
		},
		{
			id: "magnitude",
			term: m.dictTermMagnitude(),
			definition: m.dictDefMagnitude(),
		},
		{
			id: "moonrise",
			term: m.dictTermMoonrise(),
			definition: m.dictDefMoonrise(),
		},
		{
			id: "moonset",
			term: m.dictTermMoonset(),
			definition: m.dictDefMoonset(),
		},
		{
			id: "moonSunRatio",
			term: m.dictTermMoonSunRatio(),
			definition: m.dictDefMoonSunRatio(),
		},
		{
			id: "obscuration",
			term: m.dictTermObscuration(),
			definition: m.dictDefObscuration(),
		},
		{
			id: "observer",
			term: m.dictTermObserver(),
			definition: m.dictDefObserver(),
		},
		{ id: "p1", term: m.dictTermP1(), definition: m.dictDefP1() },
		{ id: "p4", term: m.dictTermP4(), definition: m.dictDefP4() },
		{
			id: "partial",
			term: m.dictTermPartial(),
			definition: m.dictDefPartial(),
		},
		{ id: "path", term: m.dictTermPath(), definition: m.dictDefPath() },
		{
			id: "pathWidth",
			term: m.dictTermPathWidth(),
			definition: m.dictDefPathWidth(),
		},
		{
			id: "penumbra",
			term: m.dictTermPenumbra(),
			definition: m.dictDefPenumbra(),
		},
		{
			id: "penumbralEclipse",
			term: m.dictTermPenumbralEclipse(),
			definition: m.dictDefPenumbralEclipse(),
		},
		{
			id: "penumbralMagnitude",
			term: m.dictTermPenumbralMagnitude(),
			definition: m.dictDefPenumbralMagnitude(),
		},
		{ id: "saros", term: m.dictTermSaros(), definition: m.dictDefSaros() },
		{
			id: "solarEclipse",
			term: m.dictTermSolarEclipse(),
			definition: m.dictDefSolarEclipse(),
		},
		{ id: "stages", term: m.dictTermStages(), definition: m.dictDefStages() },
		{
			id: "sunrise",
			term: m.dictTermSunrise(),
			definition: m.dictDefSunrise(),
		},
		{ id: "sunset", term: m.dictTermSunset(), definition: m.dictDefSunset() },
		{
			id: "timezone",
			term: m.dictTermTimezone(),
			definition: m.dictDefTimezone(),
		},
		{ id: "total", term: m.dictTermTotal(), definition: m.dictDefTotal() },
		{
			id: "totality",
			term: m.dictTermTotality(),
			definition: m.dictDefTotality(),
		},
		{ id: "u1", term: m.dictTermU1(), definition: m.dictDefU1() },
		{ id: "u2", term: m.dictTermU2(), definition: m.dictDefU2() },
		{ id: "u3", term: m.dictTermU3(), definition: m.dictDefU3() },
		{ id: "u4", term: m.dictTermU4(), definition: m.dictDefU4() },
		{ id: "umbra", term: m.dictTermUmbra(), definition: m.dictDefUmbra() },
		{
			id: "umbralMagnitude",
			term: m.dictTermUmbralMagnitude(),
			definition: m.dictDefUmbralMagnitude(),
		},
		{
			id: "visible",
			term: m.dictTermVisible(),
			definition: m.dictDefVisible(),
		},
		{ id: "zenith", term: m.dictTermZenith(), definition: m.dictDefZenith() },
	];
}

export function glossaryLetter(term: string, locale: string): string {
	const first = term.trim().charAt(0);
	if (!first) {
		return "#";
	}
	return first.toLocaleUpperCase(locale);
}
