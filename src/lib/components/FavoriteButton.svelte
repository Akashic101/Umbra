<script lang="ts">
import { Button } from "flowbite-svelte";
import { StarOutline, StarSolid } from "flowbite-svelte-icons";
import { appState } from "$lib/app-state.svelte";
import { m } from "$lib/paraglide/messages.js";
import type { ObserverLocation } from "$lib/types";

let {
	date,
	location,
	size = "sm",
	class: className = "",
}: {
	date: string;
	location: ObserverLocation;
	size?: "xs" | "sm" | "md" | "lg" | "xl";
	class?: string;
} = $props();

const saved = $derived(appState.isFavorite(date, location));

function toggle(): void {
	appState.toggleFavorite(date, location);
}
</script>

<Button
	color={saved ? "yellow" : "alternative"}
	{size}
	class={className}
	onclick={toggle}
	aria-pressed={saved}
	aria-label={saved ? m.removeFromFavoritesAria() : m.saveToFavoritesAria()}
>
	{#if saved}
		<StarSolid class="h-4 w-4" />
		<span class="hidden sm:inline">{m.saved()}</span>
	{:else}
		<StarOutline class="h-4 w-4" />
		<span class="hidden sm:inline">{m.save()}</span>
	{/if}
</Button>
