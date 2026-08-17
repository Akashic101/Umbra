<script lang="ts">
import { Alert, TabItem, Tabs } from "flowbite-svelte";
import { appState } from "$lib/app-state.svelte";
import { lunarState } from "$lib/lunar-state.svelte";
import { m } from "$lib/paraglide/messages.js";
import { formatCoordinates } from "$lib/services/geocoding";
import LocationBar from "./LocationBar.svelte";
import LunarCircumstancesPanel from "./LunarCircumstancesPanel.svelte";
import LunarEclipseList from "./LunarEclipseList.svelte";
import LunarFilters from "./LunarFilters.svelte";

const locationLabel = $derived(
	appState.location
		? appState.location.label ||
				formatCoordinates(appState.location.lat, appState.location.lon)
		: m.noLocationSelected(),
);

function onTabChange(value: string | undefined): void {
	if (value === "eclipses" || value === "details") {
		lunarState.panelTab = value;
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
		{#if lunarState.error}
			<Alert color="red" class="py-2 text-sm">{lunarState.error}</Alert>
		{/if}
	</div>

	<div class="flex min-h-0 flex-1 flex-col px-3 pt-2">
		<Tabs
			tabStyle="underline"
			divider={false}
			bind:selected={() => lunarState.panelTab, (value) => onTabChange(value)}
			class="w-full shrink-0"
			classes={{
				content:
					"min-h-0 flex-1 overflow-y-auto pt-3 pb-3 [overflow-anchor:none]",
			}}
		>
			<TabItem
				key="eclipses"
				title={m.tabEclipses()}
				open={lunarState.panelTab === "eclipses"}
			>
				<div class="flex flex-col gap-3">
					<LocationBar />
					<LunarFilters />
					<LunarEclipseList />
				</div>
			</TabItem>
			<TabItem
				key="details"
				title={m.tabDetails()}
				open={lunarState.panelTab === "details"}
			>
				<div class="flex flex-col gap-3">
					<LunarCircumstancesPanel />
					<p class="text-xs text-gray-500 dark:text-gray-400">
						{m.lunarAttributionPrefix()}
						<a class="underline" href="https://www.openstreetmap.org/copyright"
							>{m.attributionOsm()}</a
						>
						{m.attributionSuffix()}
					</p>
				</div>
			</TabItem>
		</Tabs>
	</div>
</div>
