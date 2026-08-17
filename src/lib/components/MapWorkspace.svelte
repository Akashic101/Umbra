<script lang="ts">
import type { Snippet } from "svelte";
import { m } from "$lib/paraglide/messages.js";

let {
	listOpen = $bindable(false),
	map,
	panel,
}: {
	listOpen?: boolean;
	map: Snippet;
	panel: Snippet;
} = $props();
</script>

<div class="flex h-full min-h-0">
	<div class="flex min-h-0 min-w-0 flex-1 flex-col">
		<div class="relative min-h-0 flex-1">
			<div
				class={[
					"h-full min-h-0",
					listOpen && "max-md:invisible max-md:absolute max-md:inset-0",
				]}
			>
				{@render map()}
			</div>
			<div
				class={[
					"absolute inset-0 min-h-0 overflow-hidden bg-white dark:bg-gray-900 md:hidden",
					!listOpen && "pointer-events-none invisible",
				]}
			>
				{@render panel()}
			</div>
		</div>
		<nav
			class="grid grid-cols-2 border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 md:hidden"
			aria-label={m.mobileViewAria()}
		>
			<button
				type="button"
				class={[
					"px-3 py-3 text-sm",
					!listOpen
						? "font-semibold text-primary-700 dark:text-primary-300"
						: "text-gray-600 dark:text-gray-400",
				]}
				aria-current={!listOpen ? "page" : undefined}
				onclick={() => (listOpen = false)}
			>
				{m.mobileMapButton()}
			</button>
			<button
				type="button"
				class={[
					"px-3 py-3 text-sm",
					listOpen
						? "font-semibold text-primary-700 dark:text-primary-300"
						: "text-gray-600 dark:text-gray-400",
				]}
				aria-current={listOpen ? "page" : undefined}
				onclick={() => (listOpen = true)}
			>
				{m.mobileListButton()}
			</button>
		</nav>
	</div>
	<aside
		class="hidden h-full w-[24rem] shrink-0 overflow-hidden border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 md:block"
	>
		{@render panel()}
	</aside>
</div>
