import { locationSettingsUrl, openLocationSettings } from "$lib/env/tauri";
import { m } from "$lib/paraglide/messages.js";
import { eclipseService } from "$lib/services/eclipse";
import { elevation } from "$lib/services/elevation";
import { favoriteId, favoritesService } from "$lib/services/favorites";
import { formatCoordinates, geocoding } from "$lib/services/geocoding";
import { GeolocationError, geolocation } from "$lib/services/geolocation";
import { persistence } from "$lib/services/persistence";
import {
	type CatalogEntry,
	DEFAULT_FILTERS,
	type EclipseFilters,
	type EclipsePaths,
	type EclipseType,
	type FavoriteEclipse,
	type LocalCircumstances,
	type LocalSummary,
	localIsoDate,
	type AppEclipseKind,
	type ObserverLocation,
} from "$lib/types";

export class AppState {
	location = $state<ObserverLocation | null>(null);
	filters = $state<EclipseFilters>({
		...DEFAULT_FILTERS,
		types: [...DEFAULT_FILTERS.types],
	});
	selectedDate = $state<string | null>(null);
	catalog = $state<CatalogEntry[]>([]);
	localByDate = $state<Record<string, LocalSummary>>({});
	circumstances = $state<LocalCircumstances | null>(null);
	paths = $state<EclipsePaths | null>(null);
	loadingCatalog = $state(false);
	loadingLocal = $state(false);
	loadingDetail = $state(false);
	searchQuery = $state("");
	searchResults = $state<Awaited<ReturnType<typeof geocoding.search>>>([]);
	error = $state<string | null>(null);
	locationPermissionDenied = $state(false);
	mobileOpen = $state(false);
	ready = $state(false);
	/** Sidebar tab: find/filter eclipses vs local circumstances. */
	panelTab = $state<"eclipses" | "details">("eclipses");
	favorites = $state.raw<FavoriteEclipse[]>(favoritesService.load());

	filteredCatalog = $derived.by(() => this.applyFilters());

	/** Upcoming first, then chronological. */
	sortedFavorites = $derived.by(() => {
		const today = localIsoDate();
		return [...this.favorites].sort((a, b) => {
			const aUpcoming = a.date >= today ? 0 : 1;
			const bUpcoming = b.date >= today ? 0 : 1;
			if (aUpcoming !== bUpcoming) {
				return aUpcoming - bUpcoming;
			}
			return a.date.localeCompare(b.date);
		});
	});

	async init(): Promise<void> {
		this.loadingCatalog = true;
		try {
			this.catalog = await eclipseService.getCatalog();
			if (!this.selectedDate && this.filteredCatalog.length) {
				this.selectedDate = this.defaultSelectedDate();
			}
			await this.ensureTerrainElevation();
			await this.refreshForLocation();
		} catch (error) {
			this.error =
				error instanceof Error ? error.message : m.errorFailedLoadEclipses();
		} finally {
			this.loadingCatalog = false;
		}
	}

	/** Sync observer height from terrain DEM (Open-Meteo / Copernicus GLO-90). */
	private async ensureTerrainElevation(): Promise<void> {
		const loc = this.location;
		if (!loc) {
			return;
		}
		const meters = await elevation.getMeters(loc.lat, loc.lon);
		if (meters === null || !this.location) {
			return;
		}
		if (this.location.height === meters) {
			return;
		}
		this.location = { ...this.location, height: meters };
		this.persist();
	}

	async setLocation(
		location: ObserverLocation,
		reverseLabel = false,
	): Promise<void> {
		const meters = await elevation.getMeters(location.lat, location.lon);
		const next: ObserverLocation = {
			...location,
			height: meters ?? location.height ?? 0,
		};
		this.location = next;
		if (reverseLabel && !next.label) {
			try {
				const place = await geocoding.reverse(next.lat, next.lon);
				if (place && this.location?.lat === next.lat) {
					this.location = {
						...this.location,
						label: place.label,
					};
				}
			} catch {
				if (this.location) {
					this.location = {
						...this.location,
						label: formatCoordinates(next.lat, next.lon),
					};
				}
			}
		}
		this.persist();
		await this.refreshForLocation();
	}

	async useGps(options: { openSettingsOnFail?: boolean } = {}): Promise<void> {
		this.error = null;
		this.locationPermissionDenied = false;
		try {
			const position = await geolocation.getCurrentPosition();
			await this.setLocation(
				{
					lat: position.lat,
					lon: position.lon,
					height: position.height,
					label: "",
				},
				true,
			);
		} catch (error) {
			const denied = error instanceof GeolocationError && error.code === 1;
			this.locationPermissionDenied = true;
			this.error = denied
				? m.errorGpsPermissionDenied()
				: error instanceof Error
					? error.message
					: m.errorUnableGps();
			const unavailable = error instanceof GeolocationError && error.code === 2;
			const openSettingsOnFail = options.openSettingsOnFail ?? true;
			if (
				openSettingsOnFail &&
				(denied || unavailable) &&
				locationSettingsUrl()
			) {
				void openLocationSettings();
			}
		}
	}

	async searchPlaces(): Promise<void> {
		this.error = null;
		this.locationPermissionDenied = false;
		try {
			this.searchResults = await geocoding.search(this.searchQuery);
			if (!this.searchResults.length) {
				this.error = m.errorNoPlacesFound();
			}
		} catch (error) {
			this.error =
				error instanceof Error ? error.message : m.errorPlaceSearchFailed();
		}
	}

	async choosePlace(index: number): Promise<void> {
		const place = this.searchResults[index];
		if (!place) {
			return;
		}
		this.searchResults = [];
		this.searchQuery = place.label;
		await this.setLocation({
			lat: place.lat,
			lon: place.lon,
			height: 0,
			label: place.label,
		});
	}

	async selectEclipse(date: string, openDetails = true): Promise<void> {
		this.selectedDate = date;
		if (openDetails) {
			this.panelTab = "details";
		}
		this.persist();
		await this.loadDetail();
	}

	setFilters(partial: Partial<EclipseFilters>): void {
		this.filters = { ...this.filters, ...partial };
		this.persist();
		if (
			this.selectedDate &&
			!this.filteredCatalog.some((entry) => entry.date === this.selectedDate)
		) {
			const next = this.defaultSelectedDate();
			if (next) {
				// Stay on the Eclipses tab; only list clicks open Details.
				void this.selectEclipse(next, false);
			} else {
				this.selectedDate = null;
				this.circumstances = null;
				this.paths = null;
			}
		}
	}

	toggleType(type: EclipseType): void {
		const types = this.filters.types.includes(type)
			? this.filters.types.filter((item) => item !== type)
			: [...this.filters.types, type];
		this.setFilters({ types: types.length ? types : [type] });
	}

	private async refreshForLocation(): Promise<void> {
		if (!this.location) {
			this.localByDate = {};
			this.circumstances = null;
			await this.loadDetail();
			return;
		}
		this.loadingLocal = true;
		this.error = null;
		try {
			const summaries = await eclipseService.getLocalSummaries(this.location);
			const next: Record<string, LocalSummary> = {};
			for (const summary of summaries) {
				next[summary.date] = summary;
			}
			this.localByDate = next;
			await this.loadDetail();
		} catch (error) {
			this.error =
				error instanceof Error
					? error.message
					: m.errorFailedLocalCircumstances();
		} finally {
			this.loadingLocal = false;
		}
	}

	private async loadDetail(): Promise<void> {
		if (!this.selectedDate) {
			this.circumstances = null;
			this.paths = null;
			return;
		}
		this.loadingDetail = true;
		try {
			const [paths, circumstances] = await Promise.all([
				eclipseService.getPaths(this.selectedDate),
				this.location
					? eclipseService.getCircumstances(this.selectedDate, this.location)
					: Promise.resolve(null),
			]);
			this.paths = paths;
			this.circumstances = circumstances;
		} catch (error) {
			this.error =
				error instanceof Error ? error.message : m.errorFailedLoadDetails();
		} finally {
			this.loadingDetail = false;
		}
	}

	/**
	 * Type chips filter the global catalog type.
	 * Local type (what you see here) is shown on each row; use
	 * “Visible at this location” / min coverage for local circumstances.
	 */
	private matchesTypeFilter(entry: CatalogEntry): boolean {
		return this.filters.types.includes(entry.type);
	}

	private applyFilters(): CatalogEntry[] {
		return this.catalog.filter((entry) => {
			const year = Number(entry.date.slice(0, 4));
			const local = this.localByDate[entry.date];
			if (!this.matchesTypeFilter(entry)) {
				return false;
			}
			if (year < this.filters.yearFrom || year > this.filters.yearTo) {
				return false;
			}
			if (this.filters.dateFrom && entry.date < this.filters.dateFrom) {
				return false;
			}
			if (this.filters.dateTo && entry.date > this.filters.dateTo) {
				return false;
			}
			const duration = local?.durationSeconds ?? entry.maxDurationSeconds;
			const central =
				local?.centralDurationSeconds ?? entry.maxCentralDurationSeconds;
			if (duration < this.filters.minDurationSeconds) {
				return false;
			}
			if (central < this.filters.minCentralDurationSeconds) {
				return false;
			}
			if (this.filters.minObscuration > 0) {
				const obscuration = local?.obscuration ?? 0;
				if (obscuration < this.filters.minObscuration) {
					return false;
				}
			}
			if (this.filters.visibleHere) {
				if (!this.location || !local?.visible) {
					return false;
				}
			}
			return true;
		});
	}

	private defaultSelectedDate(): string | null {
		const today = localIsoDate();
		const upcoming = this.filteredCatalog.find((entry) => entry.date >= today);
		return upcoming?.date ?? this.filteredCatalog.at(-1)?.date ?? null;
	}

	hydrate(partial: {
		location?: ObserverLocation | null;
		selectedDate?: string | null;
		filters?: EclipseFilters;
	}): void {
		if (partial.location !== undefined) {
			this.location = partial.location;
		}
		if (partial.selectedDate !== undefined) {
			this.selectedDate = partial.selectedDate;
		}
		if (partial.filters) {
			this.filters = {
				...DEFAULT_FILTERS,
				...partial.filters,
				types: [...partial.filters.types],
			};
		}
	}

	persist(): void {
		persistence.save({
			location: this.location,
			selectedDate: this.selectedDate,
			filters: this.filters,
		});
	}

	isFavorite(
		date: string,
		location: ObserverLocation,
		kind: AppEclipseKind = "solar",
	): boolean {
		const id = favoriteId(date, location, kind);
		return this.favorites.some((item) => item.id === id);
	}

	toggleFavorite(
		date: string,
		location: ObserverLocation,
		kind: AppEclipseKind = "solar",
	): void {
		const id = favoriteId(date, location, kind);
		if (this.favorites.some((item) => item.id === id)) {
			this.favorites = this.favorites.filter((item) => item.id !== id);
		} else {
			const next: FavoriteEclipse = {
				id,
				kind,
				date,
				location: {
					lat: location.lat,
					lon: location.lon,
					height: location.height,
					label: location.label,
				},
				savedAt: new Date().toISOString(),
			};
			this.favorites = [...this.favorites, next];
		}
		favoritesService.save(this.favorites);
	}

	removeFavorite(id: string): void {
		this.favorites = this.favorites.filter((item) => item.id !== id);
		favoritesService.save(this.favorites);
	}

	clearFavorites(): void {
		this.favorites = [];
		favoritesService.save(this.favorites);
	}
}

export const appState = new AppState();
