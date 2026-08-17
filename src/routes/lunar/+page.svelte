<script lang="ts">
import { Button, Drawer } from "flowbite-svelte";
import { BarsOutline } from "flowbite-svelte-icons";
import { onMount, untrack } from "svelte";
import { browser } from "$app/environment";
import { replaceState } from "$app/navigation";
import { page } from "$app/state";
import { appState } from "$lib/app-state.svelte";
import LunarSidePanel from "$lib/components/LunarSidePanel.svelte";
import EclipseMap from "$lib/components/Map.svelte";
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

<div class="relative flex h-full min-h-0">
	<div class="min-h-0 min-w-0 flex-1">
		<EclipseMap
			location={appState.location}
			{zenith}
			nightLights
			onSelect={onMapSelect}
		/>
	</div>
	<aside
		class="hidden h-full w-[24rem] shrink-0 overflow-hidden border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 md:block"
	>
		<LunarSidePanel />
	</aside>
	<div class="absolute bottom-4 right-4 z-[1000] md:hidden">
		<Button onclick={() => (lunarState.mobileOpen = true)}>
			{m.mobileDetailsButton()}
		</Button>
	</div>
	<Drawer
		bind:open={lunarState.mobileOpen}
		placement="bottom"
		class="h-[85dvh] pb-[env(safe-area-inset-bottom)] md:hidden"
	>
		<div class="flex items-center gap-2 px-3 pt-3">
			<BarsOutline class="h-5 w-5" />
			<p class="font-medium">{m.mobileDrawerTitle()}</p>
		</div>
		<LunarSidePanel />
	</Drawer>
</div>
