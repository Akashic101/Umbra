<script lang="ts">
import { Search } from "flowbite-svelte";
import { glossaryLetter, listGlossary } from "$lib/glossary";
import { m } from "$lib/paraglide/messages.js";
import { getLocale } from "$lib/paraglide/runtime";

let query = $state("");

const locale = $derived(getLocale());

const allEntries = $derived.by(() => {
	locale;
	return listGlossary();
});

const filtered = $derived.by(() => {
	const needle = query.trim().toLocaleLowerCase(locale);
	const rows = needle
		? allEntries.filter(
				(entry) =>
					entry.term.toLocaleLowerCase(locale).includes(needle) ||
					entry.definition.toLocaleLowerCase(locale).includes(needle),
			)
		: [...allEntries];
	return rows.sort((a, b) => a.term.localeCompare(b.term, locale));
});

const groups = $derived.by(() => {
	const byLetter: Record<string, typeof filtered> = {};
	for (const entry of filtered) {
		const letter = glossaryLetter(entry.term, locale);
		const list = byLetter[letter] ?? [];
		list.push(entry);
		byLetter[letter] = list;
	}
	return Object.entries(byLetter)
		.sort(([a], [b]) => a.localeCompare(b, locale))
		.map(([letter, entries]) => ({ letter, entries }));
});
</script>

<svelte:head>
	<title>{m.dictTitle()} — {m.brandName()}</title>
	<meta name="description" content={m.dictLead()}>
</svelte:head>

<div
	class="mx-auto flex h-full w-full max-w-3xl flex-col gap-4 overflow-y-auto px-4 pb-10 pt-4 sm:px-6"
>
	<header>
		<p class="text-xs text-gray-500 dark:text-gray-400">{m.dictEyebrow()}</p>
		<h1 class="text-xl font-semibold text-gray-900 dark:text-white">
			{m.dictTitle()}
		</h1>
		<p class="mt-2 text-sm text-gray-600 dark:text-gray-300">{m.dictLead()}</p>
	</header>

	<Search
		bind:value={query}
		placeholder={m.dictSearchPlaceholder()}
		class="w-full"
		clearable
		aria-label={m.dictSearchAria()}
	/>

	<p class="text-sm text-gray-500 dark:text-gray-400">
		{m.dictEntryCount({ count: filtered.length })}
	</p>

	{#if groups.length === 0}
		<p class="text-sm text-gray-600 dark:text-gray-300">{m.dictNoResults()}</p>
	{:else}
		{#if !query.trim()}
			<nav class="flex flex-wrap gap-1.5" aria-label={m.dictLetterNavAria()}>
				{#each groups as group (group.letter)}
					<a
						href={`#letter-${group.letter}`}
						class="rounded px-1.5 py-0.5 text-sm font-medium text-primary-700 hover:underline dark:text-primary-300"
					>
						{group.letter}
					</a>
				{/each}
			</nav>
		{/if}

		{#each groups as group (group.letter)}
			<section class="space-y-3" aria-labelledby={`letter-${group.letter}`}>
				<h2
					id={`letter-${group.letter}`}
					class="sticky top-0 z-10 bg-white py-1 text-lg font-semibold text-gray-900 dark:bg-gray-900 dark:text-white"
				>
					{group.letter}
				</h2>
				<dl class="divide-y divide-gray-200 dark:divide-gray-700">
					{#each group.entries as entry (entry.id)}
						<div class="py-3" id={entry.id}>
							<dt class="font-medium text-gray-900 dark:text-white">
								{entry.term}
							</dt>
							<dd class="mt-1 text-sm text-gray-600 dark:text-gray-300">
								{entry.definition}
							</dd>
						</div>
					{/each}
				</dl>
			</section>
		{/each}
	{/if}
</div>
