<script lang="ts">
import {
	Badge,
	Button,
	Listgroup,
	ListgroupItem,
	Search,
} from "flowbite-svelte";
import {
	CogOutline,
	MapPinOutline,
	SearchOutline,
} from "flowbite-svelte-icons";
import { appState } from "$lib/app-state.svelte";
import { locationSettingsUrl, openLocationSettings } from "$lib/env/tauri";
import { m } from "$lib/paraglide/messages.js";
import { formatCoordinates } from "$lib/services/geocoding";

async function onSearch(event: Event): Promise<void> {
	event.preventDefault();
	await appState.searchPlaces();
}

const locationLabel = $derived(
	appState.location
		? appState.location.label ||
				formatCoordinates(appState.location.lat, appState.location.lon)
		: "",
);

const canOpenSettings = locationSettingsUrl() !== null;
</script>

<form class="flex flex-col gap-2" onsubmit={onSearch}>
	<div class="relative flex flex-col gap-2">
		<div class="flex gap-2">
			<Search
				bind:value={appState.searchQuery}
				placeholder={m.searchPlacePlaceholder()}
				class="w-full"
				clearable
				aria-label={m.searchPlaceAria()}
			/>
			<Button type="submit" color="primary" class="shrink-0">
				<SearchOutline class="h-4 w-4" />
				<span class="sr-only">{m.searchSubmitAria()}</span>
			</Button>
			<Button
				type="button"
				color="alternative"
				class="shrink-0"
				onclick={() => appState.useGps()}
			>
				<MapPinOutline class="h-4 w-4" />
				<span class="sr-only">{m.useGpsAria()}</span>
			</Button>
			{#if canOpenSettings}
				<Button
					type="button"
					color="alternative"
					class="shrink-0"
					aria-label={m.openLocationSettingsAria()}
					onclick={() => void openLocationSettings()}
				>
					<CogOutline class="h-4 w-4" />
					<span class="sr-only">{m.openLocationSettings()}</span>
				</Button>
			{/if}
		</div>
		{#if appState.searchResults.length}
			<Listgroup
				class="absolute top-full left-0 z-20 mt-1 max-h-40 w-full overflow-auto shadow-md"
			>
				{#each appState.searchResults as place, index (place.label + index)}
					<ListgroupItem>
						<button
							type="button"
							class="w-full text-left"
							onclick={() => appState.choosePlace(index)}
						>
							{place.label}
						</button>
					</ListgroupItem>
				{/each}
			</Listgroup>
		{/if}
	</div>
	<div class="flex h-8 min-h-8 items-center overflow-hidden">
		{#if appState.location}
			<Badge color="blue" class="max-w-full truncate" title={locationLabel}>
				{locationLabel}
			</Badge>
		{:else}
			<p class="truncate text-sm text-gray-500 dark:text-gray-400">
				{m.pickLocationHint()}
			</p>
		{/if}
	</div>
</form>
