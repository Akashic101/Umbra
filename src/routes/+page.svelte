<script lang="ts">
import { onMount } from "svelte";
import { browser } from "$app/environment";
import { replaceState } from "$app/navigation";
import { page } from "$app/state";
import { appState } from "$lib/app-state.svelte";
import EclipseMap from "$lib/components/Map.svelte";
import MapWorkspace from "$lib/components/MapWorkspace.svelte";
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
			height: 0,
			label: "",
		},
		true,
	);
}
</script>

<div class="h-full min-h-0">
	<MapWorkspace bind:listOpen={appState.mobileOpen}>
		{#snippet map()}
			<EclipseMap
				location={appState.location}
				paths={appState.paths}
				onSelect={onMapSelect}
			/>
		{/snippet}
		{#snippet panel()}
			<SidePanel />
		{/snippet}
	</MapWorkspace>
</div>
