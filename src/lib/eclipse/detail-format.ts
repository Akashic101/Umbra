import { m } from "$lib/paraglide/messages.js";
import type {
	ContactDaylight,
	DaylightPhase,
	EclipseType,
	LocalEclipseType,
	PathStatus,
} from "$lib/types";
import type { EclipseNowPhase } from "./now-mode";

export function formatPathStatus(status: PathStatus): string {
	switch (status) {
		case "inside_totality":
			return m.pathInsideTotality();
		case "inside_annularity":
			return m.pathInsideAnnularity();
		case "partial_only":
			return m.pathPartialOnly();
		case "outside":
			return m.pathOutside();
	}
}

export function formatPathWidthKm(meters: number): string {
	if (!Number.isFinite(meters) || meters <= 0) {
		return m.emDash();
	}
	const km = meters / 1000;
	if (km >= 10) {
		return m.pathWidthKm({ km: km.toFixed(0) });
	}
	if (km >= 1) {
		return m.pathWidthKm({ km: km.toFixed(1) });
	}
	return m.pathWidthM({ meters: Math.round(meters) });
}

export function formatDaylightPhase(phase: DaylightPhase): string {
	switch (phase) {
		case "day":
			return m.daylightDay();
		case "night":
			return m.daylightNight();
		case "unknown":
			return m.daylightUnknown();
	}
}

export function formatEclipseType(
	type: EclipseType | LocalEclipseType | null | undefined,
): string {
	switch (type) {
		case "total":
			return m.typeTotal();
		case "annular":
			return m.typeAnnular();
		case "hybrid":
			return m.typeHybrid();
		case "partial":
			return m.typePartial();
		default:
			return m.emDash();
	}
}

/** Full sentence-style title, e.g. “Totale Finsternis” (avoids adjective inflection). */
export function formatLocalTypeTitle(type: LocalEclipseType): string {
	switch (type) {
		case "total":
			return m.localTypeTotal();
		case "annular":
			return m.localTypeAnnular();
		case "partial":
			return m.localTypePartial();
		case "none":
			return m.localTypeNone();
	}
}

/** Word used for the C2/C3 phase in chart legends. */
export function formatCentralWord(type: LocalEclipseType): string {
	if (type === "total") {
		return m.centralWordTotality();
	}
	if (type === "annular") {
		return m.centralWordAnnularity();
	}
	return m.centralWordEither();
}

export function formatGamma(gamma: number): string {
	if (!Number.isFinite(gamma)) {
		return m.emDash();
	}
	return gamma.toFixed(4);
}

export function formatMoonSunRatio(ratio: number): string {
	if (!Number.isFinite(ratio) || ratio <= 0) {
		return m.emDash();
	}
	return ratio.toFixed(3);
}

/** Contact name that depends on the local type (C2/C3 become totality/annularity). */
export function formatContactLabel(
	key: ContactDaylight["key"],
	localType: LocalEclipseType,
): string {
	switch (key) {
		case "c1":
			return m.firstContact();
		case "c2":
			if (localType === "total") {
				return m.totalityBegins();
			}
			return localType === "annular" ? m.annularityBegins() : m.secondContact();
		case "max":
			return m.greatestEclipse();
		case "c3":
			if (localType === "total") {
				return m.totalityEnds();
			}
			return localType === "annular" ? m.annularityEnds() : m.thirdContact();
		case "c4":
			return m.fourthContact();
	}
}

/** Contact name prefixed with its stage code, e.g. “C2 — Totality begins”. */
export function formatStageLabel(
	key: ContactDaylight["key"],
	localType: LocalEclipseType,
): string {
	switch (key) {
		case "c1":
			return m.stageC1();
		case "c2":
			return m.stageC2({ label: formatContactLabel("c2", localType) });
		case "max":
			return m.stageGreatest();
		case "c3":
			return m.stageC3({ label: formatContactLabel("c3", localType) });
		case "c4":
			return m.stageC4();
	}
}

export function formatNowPhase(
	phase: EclipseNowPhase,
	localType: LocalEclipseType,
): string {
	switch (phase) {
		case "upcoming":
			return m.nowPhaseUpcoming();
		case "partial_ingress":
			return m.nowPhasePartialIngress();
		case "central":
			if (localType === "total") {
				return m.nowPhaseCentralTotality();
			}
			if (localType === "annular") {
				return m.nowPhaseCentralAnnularity();
			}
			return m.nowPhaseCentral();
		case "partial_egress":
			return m.nowPhasePartialEgress();
		case "ended":
			return m.nowPhaseEnded();
	}
}

export function formatDirectionName(code: string): string {
	switch (code.toUpperCase()) {
		case "N":
			return m.dirN();
		case "NNE":
			return m.dirNNE();
		case "NE":
			return m.dirNE();
		case "ENE":
			return m.dirENE();
		case "E":
			return m.dirE();
		case "ESE":
			return m.dirESE();
		case "SE":
			return m.dirSE();
		case "SSE":
			return m.dirSSE();
		case "S":
			return m.dirS();
		case "SSW":
			return m.dirSSW();
		case "SW":
			return m.dirSW();
		case "WSW":
			return m.dirWSW();
		case "W":
			return m.dirW();
		case "WNW":
			return m.dirWNW();
		case "NW":
			return m.dirNW();
		case "NNW":
			return m.dirNNW();
		default:
			return code;
	}
}

export function formatLookDirection(
	directionCode: string | null,
	altitudeDeg: number | null,
): string {
	if (!directionCode) {
		return m.emDash();
	}
	const name = formatDirectionName(directionCode);
	const alt = Math.round(altitudeDeg ?? 0);
	if (alt < 0) {
		return m.lookBelowHorizon({ name, altitude: Math.abs(alt) });
	}
	return m.lookAboveHorizon({ name, altitude: alt });
}
