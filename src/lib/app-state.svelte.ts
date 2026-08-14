import { eclipseService } from "$lib/services/eclipse";
import { formatCoordinates, geocoding } from "$lib/services/geocoding";
import { geolocation } from "$lib/services/geolocation";
import { persistence } from "$lib/services/persistence";
import {
	type CatalogEntry,
	DEFAULT_FILTERS,
	type EclipseFilters,
	type EclipsePaths,
	type EclipseType,
	type LocalCircumstances,
	type LocalSummary,
	localIsoDate,
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
	mobileOpen = $state(false);
	ready = $state(false);
	/** Sidebar tab: find/filter eclipses vs local circumstances. */
	panelTab = $state<"eclipses" | "details">("eclipses");

	filteredCatalog = $derived.by(() => this.applyFilters());

	async init(): Promise<void> {
		this.loadingCatalog = true;
		try {
			this.catalog = await eclipseService.getCatalog();
			if (!this.selectedDate && this.filteredCatalog.length) {
				this.selectedDate = this.defaultSelectedDate();
			}
			await this.refreshForLocation();
		} catch (error) {
			this.error =
				error instanceof Error ? error.message : "Failed to load eclipses.";
		} finally {
			this.loadingCatalog = false;
		}
	}

	async setLocation(
		location: ObserverLocation,
		reverseLabel = false,
	): Promise<void> {
		this.location = location;
		if (reverseLabel && !location.label) {
			try {
				const place = await geocoding.reverse(location.lat, location.lon);
				if (place && this.location?.lat === location.lat) {
					this.location = {
						...this.location,
						label: place.label,
					};
				}
			} catch {
				if (this.location) {
					this.location = {
						...this.location,
						label: formatCoordinates(location.lat, location.lon),
					};
				}
			}
		}
		this.persist();
		await this.refreshForLocation();
	}

	async useGps(): Promise<void> {
		this.error = null;
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
			this.error =
				error instanceof Error ? error.message : "Unable to get GPS position.";
		}
	}

	async searchPlaces(): Promise<void> {
		this.error = null;
		try {
			this.searchResults = await geocoding.search(this.searchQuery);
			if (!this.searchResults.length) {
				this.error = "No places found.";
			}
		} catch (error) {
			this.error =
				error instanceof Error ? error.message : "Place search failed.";
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
					: "Failed to compute local circumstances.";
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
				error instanceof Error
					? error.message
					: "Failed to load eclipse details.";
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
}

export const appState = new AppState();
