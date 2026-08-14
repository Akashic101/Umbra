<script lang="ts">
import { Alert, TabItem, Tabs } from "flowbite-svelte";
import { appState } from "$lib/app-state.svelte";
import { formatCoordinates } from "$lib/services/geocoding";
import CircumstancesPanel from "./CircumstancesPanel.svelte";
import EclipseList from "./EclipseList.svelte";
import Filters from "./Filters.svelte";
import LocationBar from "./LocationBar.svelte";

const locationLabel = $derived(
	appState.location
		? appState.location.label ||
				formatCoordinates(appState.location.lat, appState.location.lon)
		: "No location selected",
);

function onTabChange(value: string | undefined): void {
	if (value === "eclipses" || value === "details") {
		appState.panelTab = value;
	}
}
</script>

<div class="flex h-full min-h-0 flex-col">
	<div
		class="shrink-0 space-y-2 border-b border-gray-200 px-3 pt-3 pb-2 dark:border-gray-700"
	>
		<p
			class="h-5 truncate text-sm font-medium text-gray-900 dark:text-white"
			title={locationLabel}
		>
			{locationLabel}
		</p>
		{#if appState.error}
			<Alert color="red" class="py-2 text-sm">{appState.error}</Alert>
		{/if}
	</div>

	<div class="flex min-h-0 flex-1 flex-col px-3 pt-2">
		<Tabs
			tabStyle="underline"
			divider={false}
			bind:selected={() => appState.panelTab, (value) => onTabChange(value)}
			class="w-full shrink-0"
			classes={{
				content:
					"min-h-0 flex-1 overflow-y-auto pt-3 pb-3 [overflow-anchor:none]",
			}}
		>
			<TabItem
				key="eclipses"
				title="Eclipses"
				open={appState.panelTab === "eclipses"}
			>
				<div class="flex flex-col gap-3">
					<LocationBar />
					<Filters />
					<EclipseList />
				</div>
			</TabItem>
			<TabItem
				key="details"
				title="Details"
				open={appState.panelTab === "details"}
			>
				<div class="flex flex-col gap-3">
					<CircumstancesPanel />
					<p class="text-xs text-gray-500 dark:text-gray-400">
						Eclipse calculations use NASA Besselian elements via
						astronomy-bundle. Map data ©
						<a class="underline" href="https://www.openstreetmap.org/copyright"
							>OpenStreetMap</a
						>
						contributors.
					</p>
				</div>
			</TabItem>
		</Tabs>
	</div>
</div>
