import type { EclipsePaths } from "$lib/types";
import { getEclipse } from "./catalog";

export function getEclipsePaths(date: string): EclipsePaths {
	const eclipse = getEclipse(date);
	return {
		penumbra: eclipse.getPenumbraPathPolygon({ stepsInSeconds: 30 }),
		umbra: eclipse.getUmbraPathPolygon({ stepsInSeconds: 20 }),
		centralLine: eclipse.getCentralLine({ stepsInSeconds: 20 }),
	};
}
