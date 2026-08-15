import type { TimeOfInterest } from "@astronomy-bundle/core";

/**
 * Worker-safe time helpers: this module must stay free of paraglide imports so
 * the eclipse worker never pulls in locale runtime code.
 */
export function toiToIso(
	toi: TimeOfInterest | null | undefined,
): string | null {
	if (!toi) {
		return null;
	}
	return toi.getDate().toISOString();
}
