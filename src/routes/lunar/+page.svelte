<script lang="ts">
import { onMount, untrack } from "svelte";
import { browser } from "$app/environment";
import { replaceState } from "$app/navigation";
import { page } from "$app/state";
import { appState } from "$lib/app-state.svelte";
import LunarSidePanel from "$lib/components/LunarSidePanel.svelte";
import EclipseMap from "$lib/components/Map.svelte";
import MapWorkspace from "$lib/components/MapWorkspace.svelte";
import { lunarState } from "$lib/lunar-state.svelte";
import { m } from "$lib/paraglide/messages.js";
import {
	lunarPersistence,
	parseLunarQuery,
	serializeLunarQuery,
} from "$lib/services/lunar-persistence";
import { persistence } from "$lib/services/persistence";

let skipLocationRefresh = true;

onMount(async () => {
	if (!appState.location) {
		const stored = persistence.load();
		if (stored?.location) {
			appState.hydrate({ location: stored.location });
		}
	}
	const lunarStored = lunarPersistence.load();
	if (lunarStored) {
		lunarState.hydrate(lunarStored);
	}
	lunarState.hydrate(parseLunarQuery(page.url.search));
	await lunarState.init();
	lunarState.ready = true;
});

$effect(() => {
	appState.location;
	if (!lunarState.ready) {
		return;
	}
	if (skipLocationRefresh) {
		skipLocationRefresh = false;
		return;
	}
	untrack(() => {
		void lunarState.refreshForLocation();
	});
});

$effect(() => {
	if (!browser || !lunarState.ready) {
		return;
	}
	const query = serializeLunarQuery({
		location: appState.location,
		selectedDate: lunarState.selectedDate,
		filters: lunarState.filters,
	});
	const nextSearch = query ? `?${query}` : "";
	if (nextSearch === page.url.search) {
		return;
	}
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

const zenith = $derived.by(() => {
	const entry = lunarState.selectedEntry;
	if (!entry) {
		return null;
	}
	return { lat: entry.zenithLat, lon: entry.zenithLon };
});
</script>

<svelte:head>
	<title>{m.navLunar()} — {m.brandName()}</title>
</svelte:head>

<div class="h-full min-h-0">
	<MapWorkspace bind:listOpen={lunarState.mobileOpen}>
		{#snippet map()}
			<EclipseMap
				location={appState.location}
				{zenith}
				onSelect={onMapSelect}
			/>
		{/snippet}
		{#snippet panel()}
			<LunarSidePanel />
		{/snippet}
	</MapWorkspace>
</div>
