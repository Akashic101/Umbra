import { Location } from "@astronomy-bundle/core";
import { SolarEclipse } from "@astronomy-bundle/solar-eclipse";
import { Catalogue } from "@astronomy-bundle/solar-eclipse/catalogue";
import type { CatalogEntry, EclipseType, ObserverLocation } from "$lib/types";

const eclipseCache = new Map<string, SolarEclipse>();

export function listCatalog(): CatalogEntry[] {
	return Catalogue.getAvailableEclipseDates().map((date) => {
		const eclipse = getEclipse(date);
		const greatest = eclipse.getLocationOfGreatestEclipse();
		return {
			date,
			type: eclipse.getType() as EclipseType,
			maxDurationSeconds: eclipse.getMaxDuration(),
			maxCentralDurationSeconds: eclipse.getMaxCentralDuration(),
			greatestLat: greatest.lat,
			greatestLon: greatest.lon,
		};
	});
}

export function getEclipse(date: string): SolarEclipse {
	const cached = eclipseCache.get(date);
	if (cached) {
		return cached;
	}
	const eclipse = SolarEclipse.createFromBesselianElements(
		Catalogue.getBesselianElements(date),
	);
	eclipseCache.set(date, eclipse);
	return eclipse;
}

export function toAstronomyLocation(location: ObserverLocation): Location {
	return Location.create(location.lat, location.lon, location.height);
}
