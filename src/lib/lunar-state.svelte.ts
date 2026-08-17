import { m } from "$lib/paraglide/messages.js";
import { eclipseService } from "$lib/services/eclipse";
import { lunarPersistence } from "$lib/services/lunar-persistence";
import {
	DEFAULT_LUNAR_FILTERS,
	type LunarCatalogEntry,
	type LunarEclipseFilters,
	type LunarEclipseType,
	type LunarLocalCircumstances,
	type LunarLocalSummary,
	localIsoDate,
	type ObserverLocation,
} from "$lib/types";
import { appState } from "./app-state.svelte";

export class LunarState {
	filters = $state<LunarEclipseFilters>({
		...DEFAULT_LUNAR_FILTERS,
		types: [...DEFAULT_LUNAR_FILTERS.types],
	});
	selectedDate = $state<string | null>(null);
	catalog = $state<LunarCatalogEntry[]>([]);
	localByDate = $state<Record<string, LunarLocalSummary>>({});
	circumstances = $state<LunarLocalCircumstances | null>(null);
	loadingCatalog = $state(false);
	loadingLocal = $state(false);
	loadingDetail = $state(false);
	error = $state<string | null>(null);
	mobileOpen = $state(false);
	ready = $state(false);
	panelTab = $state<"eclipses" | "details">("eclipses");

	filteredCatalog = $derived.by(() => this.applyFilters());

	selectedEntry = $derived.by(
		() =>
			this.catalog.find((entry) => entry.date === this.selectedDate) ?? null,
	);

	async init(): Promise<void> {
		this.loadingCatalog = true;
		try {
			this.catalog = await eclipseService.getLunarCatalog();
			if (!this.selectedDate && this.filteredCatalog.length) {
				this.selectedDate = this.defaultSelectedDate();
			}
			await this.refreshForLocation();
		} catch (error) {
			this.error =
				error instanceof Error ? error.message : m.errorFailedLoadEclipses();
		} finally {
			this.loadingCatalog = false;
		}
	}

	async refreshForLocation(): Promise<void> {
		const location = appState.location;
		if (!location) {
			this.localByDate = {};
			this.circumstances = null;
			await this.loadDetail();
			return;
		}
		this.loadingLocal = true;
		this.error = null;
		try {
			const summaries = await eclipseService.getLunarLocalSummaries(location);
			const next: Record<string, LunarLocalSummary> = {};
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

	async selectEclipse(date: string, openDetails = true): Promise<void> {
		this.selectedDate = date;
		if (openDetails) {
			this.panelTab = "details";
		}
		this.persist();
		await this.loadDetail();
	}

	setFilters(partial: Partial<LunarEclipseFilters>): void {
		this.filters = { ...this.filters, ...partial };
		this.persist();
		if (
			this.selectedDate &&
			!this.filteredCatalog.some((entry) => entry.date === this.selectedDate)
		) {
			const next = this.defaultSelectedDate();
			if (next) {
				void this.selectEclipse(next, false);
			} else {
				this.selectedDate = null;
				this.circumstances = null;
			}
		}
	}

	toggleType(type: LunarEclipseType): void {
		const types = this.filters.types.includes(type)
			? this.filters.types.filter((item) => item !== type)
			: [...this.filters.types, type];
		this.setFilters({ types: types.length ? types : [type] });
	}

	private async loadDetail(): Promise<void> {
		if (!this.selectedDate) {
			this.circumstances = null;
			return;
		}
		this.loadingDetail = true;
		try {
			this.circumstances = appState.location
				? await eclipseService.getLunarCircumstances(
						this.selectedDate,
						appState.location,
					)
				: null;
		} catch (error) {
			this.error =
				error instanceof Error ? error.message : m.errorFailedLoadDetails();
		} finally {
			this.loadingDetail = false;
		}
	}

	private applyFilters(): LunarCatalogEntry[] {
		return this.catalog.filter((entry) => {
			const year = Number(entry.date.slice(0, 4));
			const local = this.localByDate[entry.date];
			if (!this.filters.types.includes(entry.type)) {
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
			if (entry.umbralDurationSeconds < this.filters.minUmbralDurationSeconds) {
				return false;
			}
			if (entry.umbralMagnitude < this.filters.minUmbralMagnitude) {
				return false;
			}
			if (this.filters.visibleHere) {
				if (!appState.location || !local?.visible) {
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
		selectedDate?: string | null;
		filters?: LunarEclipseFilters;
		location?: ObserverLocation | null;
	}): void {
		if (partial.location !== undefined && partial.location) {
			appState.hydrate({ location: partial.location });
		}
		if (partial.selectedDate !== undefined) {
			this.selectedDate = partial.selectedDate;
		}
		if (partial.filters) {
			this.filters = {
				...DEFAULT_LUNAR_FILTERS,
				...partial.filters,
				types: [...partial.filters.types],
			};
		}
	}

	persist(): void {
		lunarPersistence.save({
			selectedDate: this.selectedDate,
			filters: this.filters,
		});
		appState.persist();
	}
}

export const lunarState = new LunarState();
