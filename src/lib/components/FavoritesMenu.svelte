<script lang="ts">
import {
	Button,
	Dropdown,
	DropdownHeader,
	DropdownItem,
} from "flowbite-svelte";
import { CloseOutline, StarOutline } from "flowbite-svelte-icons";
import { appState } from "$lib/app-state.svelte";
import { serializeDetailsQuery } from "$lib/details-query";
import { formatIsoDate } from "$lib/eclipse/time";
import { m } from "$lib/paraglide/messages.js";
import { formatCoordinates } from "$lib/services/geocoding";

function detailsHref(
	date: string,
	location: (typeof appState.favorites)[number]["location"],
): string {
	return `/details?${serializeDetailsQuery({ date, location })}`;
}

function placeLabel(
	location: (typeof appState.favorites)[number]["location"],
): string {
	return location.label || formatCoordinates(location.lat, location.lon);
}

function remove(event: MouseEvent, id: string): void {
	event.preventDefault();
	event.stopPropagation();
	appState.removeFavorite(id);
}
</script>

<div class="relative">
	<Button
		color="alternative"
		size="sm"
		class="gap-1.5"
		aria-label={m.favoritesAria()}
	>
		<StarOutline class="h-4 w-4" />
		<span class="hidden sm:inline">{m.favorites()}</span>
		{#if appState.favorites.length}
			<span
				class="rounded-full bg-primary-100 px-1.5 text-xs tabular-nums text-primary-800 dark:bg-primary-900 dark:text-primary-200"
			>
				{appState.favorites.length}
			</span>
		{/if}
	</Button>
	<Dropdown
		simple
		placement="bottom-end"
		class="w-72 max-w-[min(18rem,calc(100vw-2rem))]"
	>
		<DropdownHeader>
			<span class="block text-sm font-medium">{m.savedEclipses()}</span>
		</DropdownHeader>
		{#if appState.sortedFavorites.length === 0}
			<div class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
				{m.favoritesEmpty()}
			</div>
		{:else}
			{#each appState.sortedFavorites as fav (fav.id)}
				<DropdownItem
					href={detailsHref(fav.date, fav.location)}
					class="flex items-start gap-2 py-2"
				>
					<span class="min-w-0 flex-1">
						<span class="block font-medium">{formatIsoDate(fav.date)}</span>
						<span
							class="block truncate text-xs text-gray-500 dark:text-gray-400"
							title={placeLabel(fav.location)}
						>
							{placeLabel(fav.location)}
						</span>
					</span>
					<button
						type="button"
						class="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
						aria-label={m.removeFavoriteAria()}
						onclick={(event) => remove(event, fav.id)}
					>
						<CloseOutline class="h-3.5 w-3.5" />
					</button>
				</DropdownItem>
			{/each}
		{/if}
	</Dropdown>
</div>
