import type { PathStatus } from "$lib/types";

export function formatPathStatus(status: PathStatus): string {
	switch (status) {
		case "inside_totality":
			return "Inside totality";
		case "inside_annularity":
			return "Inside annularity";
		case "partial_only":
			return "Partial only";
		case "outside":
			return "Outside eclipse";
	}
}

export function formatPathWidthKm(meters: number): string {
	if (!Number.isFinite(meters) || meters <= 0) {
		return "—";
	}
	const km = meters / 1000;
	if (km >= 10) {
		return `${km.toFixed(0)} km`;
	}
	if (km >= 1) {
		return `${km.toFixed(1)} km`;
	}
	return `${Math.round(meters)} m`;
}

const DIRECTION_LABELS: Record<string, string> = {
	N: "North",
	NNE: "North-northeast",
	NE: "Northeast",
	ENE: "East-northeast",
	E: "East",
	ESE: "East-southeast",
	SE: "Southeast",
	SSE: "South-southeast",
	S: "South",
	SSW: "South-southwest",
	SW: "Southwest",
	WSW: "West-southwest",
	W: "West",
	WNW: "West-northwest",
	NW: "Northwest",
	NNW: "North-northwest",
};

export function formatLookDirectionLabel(
	directionCode: string,
	altitudeDeg: number,
): string {
	const name = DIRECTION_LABELS[directionCode] ?? directionCode;
	const alt = Math.round(altitudeDeg);
	if (alt < 0) {
		return `${name}, ${Math.abs(alt)}° below horizon`;
	}
	return `${name}, ${alt}° above horizon`;
}
