<script lang="ts">
import { Button, Drawer } from "flowbite-svelte";
import { BarsOutline } from "flowbite-svelte-icons";
import { onMount } from "svelte";
import { browser } from "$app/environment";
import { replaceState } from "$app/navigation";
import { page } from "$app/state";
import { appState } from "$lib/app-state.svelte";
import EclipseMap from "$lib/components/Map.svelte";
import SidePanel from "$lib/components/SidePanel.svelte";
import {
	parseQuery,
	persistence,
	serializeQuery,
} from "$lib/services/persistence";

onMount(async () => {
	const stored = persistence.load();
	if (stored) {
		appState.hydrate(stored);
	}
	appState.hydrate(parseQuery(page.url.search));
	await appState.init();
	appState.ready = true;
});

$effect(() => {
	if (!browser || !appState.ready) {
		return;
	}
	const query = serializeQuery({
		location: appState.location,
		selectedDate: appState.selectedDate,
		filters: appState.filters,
	});
	const nextSearch = query ? `?${query}` : "";
	if (nextSearch === page.url.search) {
		return;
	}
	// Shallow replace keeps page.state and avoids goto() resetting nested scroll.
	replaceState(`${page.url.pathname}${nextSearch}`, page.state);
});

function onMapSelect(lat: number, lon: number): void {
	void appState.setLocation(
		{
			lat,
			lon,
			height: appState.location?.height ?? 0,
			label: "",
		},
		true,
	);
}
</script>

<div class="relative flex h-full min-h-0">
	<div class="min-h-0 min-w-0 flex-1">
		<EclipseMap
			location={appState.location}
			paths={appState.paths}
			onSelect={onMapSelect}
		/>
	</div>
	<aside
		class="hidden h-full w-[24rem] shrink-0 overflow-hidden border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 md:block"
	>
		<SidePanel />
	</aside>
	<div class="absolute bottom-4 right-4 z-[1000] md:hidden">
		<Button onclick={() => (appState.mobileOpen = true)}>Details</Button>
	</div>
	<Drawer
		bind:open={appState.mobileOpen}
		placement="bottom"
		class="h-[85dvh] pb-[env(safe-area-inset-bottom)] md:hidden"
	>
		<div class="flex items-center gap-2 px-3 pt-3">
			<BarsOutline class="h-5 w-5" />
			<p class="font-medium">Eclipse details</p>
		</div>
		<SidePanel />
	</Drawer>
</div>
