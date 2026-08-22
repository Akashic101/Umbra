import { serializeDetailsQuery } from "$lib/details-query";
import type {
	AppEclipseKind,
	FavoriteEclipse,
	ObserverLocation,
} from "$lib/types";

const STORAGE_KEY = "umbra-favorites-v1";

export type FavoritesService = {
	load: () => FavoriteEclipse[];
	save: (favorites: FavoriteEclipse[]) => void;
};

export type FavoritesDeps = {
	storage?: Storage | null;
};

export function favoriteId(
	date: string,
	location: ObserverLocation,
	kind: AppEclipseKind = "solar",
): string {
	const base = [
		date,
		location.lat.toFixed(5),
		location.lon.toFixed(5),
		String(Math.round(location.height || 0)),
	].join("|");
	return kind === "solar" ? base : `${kind}|${base}`;
}

export function favoriteDetailsHref(favorite: FavoriteEclipse): string {
	const query = serializeDetailsQuery({
		date: favorite.date,
		location: favorite.location,
	});
	return favorite.kind === "lunar" ? `/lunar/details?${query}` : `/details?${query}`;
}

export function createFavoritesService(
	deps: FavoritesDeps = {},
): FavoritesService {
	const storage = () =>
		deps.storage ?? (typeof localStorage === "undefined" ? null : localStorage);

	return {
		load() {
			const store = storage();
			if (!store) {
				return [];
			}
			try {
				const raw = store.getItem(STORAGE_KEY);
				if (!raw) {
					return [];
				}
				return normalizeFavorites(JSON.parse(raw));
			} catch {
				return [];
			}
		},
		save(favorites) {
			const store = storage();
			if (!store) {
				return;
			}
			try {
				store.setItem(STORAGE_KEY, JSON.stringify(favorites));
			} catch {
				// Ignore quota / private-mode failures.
			}
		},
	};
}

function normalizeFavorites(value: unknown): FavoriteEclipse[] {
	if (!Array.isArray(value)) {
		return [];
	}
	const out: FavoriteEclipse[] = [];
	for (const item of value) {
		if (!item || typeof item !== "object") {
			continue;
		}
		const record = item as Partial<FavoriteEclipse>;
		const location = normalizeLocation(record.location);
		const date =
			typeof record.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(record.date)
				? record.date
				: null;
		if (!location || !date) {
			continue;
		}
		const kind = record.kind === "lunar" ? "lunar" : "solar";
		out.push({
			id:
				typeof record.id === "string" && record.id
					? record.id
					: favoriteId(date, location, kind),
			kind,
			date,
			location,
			savedAt:
				typeof record.savedAt === "string"
					? record.savedAt
					: new Date().toISOString(),
		});
	}
	return out;
}

function normalizeLocation(
	value: ObserverLocation | null | undefined,
): ObserverLocation | null {
	if (
		!value ||
		typeof value.lat !== "number" ||
		typeof value.lon !== "number"
	) {
		return null;
	}
	return {
		lat: value.lat,
		lon: value.lon,
		height: typeof value.height === "number" ? value.height : 0,
		label: typeof value.label === "string" ? value.label : "",
	};
}

export const favoritesService = createFavoritesService();
