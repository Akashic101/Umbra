<script lang="ts">
import {
	Button,
	Listgroup,
	ListgroupItem,
	Search,
} from "flowbite-svelte";
import { MapPinOutline } from "flowbite-svelte-icons";
import { appState } from "$lib/app-state.svelte";
import { m } from "$lib/paraglide/messages.js";

async function onSearch(event: Event): Promise<void> {
	event.preventDefault();
	await appState.searchPlaces();
}
</script>

<form class="flex flex-col gap-2" onsubmit={onSearch}>
	<div class="relative">
		<div class="flex gap-2">
			<Search
				bind:value={appState.searchQuery}
				placeholder={m.searchPlacePlaceholder()}
				class="min-w-0 flex-1"
				clearable
				aria-label={m.searchPlaceAria()}
			/>
			<Button
				type="button"
				color="alternative"
				class="shrink-0"
				onclick={() => appState.useGps()}
			>
				<MapPinOutline class="h-4 w-4" />
				<span class="sr-only">{m.useGpsAria()}</span>
			</Button>
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
</form>
