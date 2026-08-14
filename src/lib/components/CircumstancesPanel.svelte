<script lang="ts">
import { Alert, Button, Card, Progressbar, Spinner } from "flowbite-svelte";
import { appState } from "$lib/app-state.svelte";
import { serializeDetailsQuery } from "$lib/details-query";
import {
	formatContactTime,
	formatDuration,
	formatPercent,
	localDateKey,
} from "$lib/eclipse/time";
import CoverageDisk from "./CoverageDisk.svelte";

const contacts = $derived(appState.circumstances?.contacts);
const showOverlay = $derived(appState.loadingDetail || appState.loadingLocal);

const detailsHref = $derived.by(() => {
	if (!appState.selectedDate || !appState.location) {
		return null;
	}
	return `/details?${serializeDetailsQuery({
		date: appState.selectedDate,
		location: {
			lat: appState.location.lat,
			lon: appState.location.lon,
			height: appState.location.height,
			label: appState.location.label,
		},
	})}`;
});

const contactRows = $derived.by(() => {
	const c = contacts;
	if (!c) {
		return [];
	}
	const rows: { key: string; label: string; iso: string | null }[] = [
		{ key: "c1", label: "First contact", iso: c.c1 },
	];
	if (c.c2) {
		rows.push({ key: "c2", label: "Second contact", iso: c.c2 });
	}
	rows.push({ key: "max", label: "Greatest", iso: c.max });
	if (c.c3) {
		rows.push({ key: "c3", label: "Third contact", iso: c.c3 });
	}
	rows.push({ key: "c4", label: "Fourth contact", iso: c.c4 });
	const days = new Set(
		rows
			.map((row) => row.iso)
			.filter((iso): iso is string => Boolean(iso))
			.map((iso) => localDateKey(iso)),
	);
	const includeDate = days.size > 1;
	return rows.map((row) => ({
		...row,
		time: formatContactTime(row.iso, { includeDate }),
	}));
});
</script>

<Card class="relative w-full p-2 max-w-none overflow-hidden" size="xl">
	{#if !appState.selectedDate}
		<p class="text-sm text-gray-500 dark:text-gray-400">
			Select an eclipse to see local times.
		</p>
	{:else if appState.circumstances?.visible}
		<div
			class="flex flex-col gap-4 transition-opacity"
			class:opacity-40={showOverlay}
			aria-busy={showOverlay}
		>
			<p class="font-medium capitalize">
				{appState.circumstances.localType}
				eclipse
			</p>
			<CoverageDisk
				obscuration={appState.circumstances.obscuration}
				magnitude={appState.circumstances.magnitude}
				moonSunRatio={appState.circumstances.moonSunRatio}
				localType={appState.circumstances.localType}
			/>
			<div>
				<p class="mb-1 text-sm">Coverage (Sun area)</p>
				<Progressbar
					progress={appState.circumstances.obscuration * 100}
					labelInside
					size="h-4"
				/>
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
					Magnitude {formatPercent(appState.circumstances.magnitude)} of the
					Sun's diameter
				</p>
			</div>
			<ul
				class="divide-y divide-gray-200 text-sm dark:divide-gray-700"
				aria-label="Eclipse contacts"
			>
				{#each contactRows as row (row.key)}
					<li
						class="flex items-baseline justify-between gap-3 py-1 first:pt-0 last:pb-0"
					>
						<span class="text-gray-600 dark:text-gray-400">{row.label}</span>
						<time
							class="shrink-0 font-medium tabular-nums text-gray-900 dark:text-white"
							datetime={row.iso ?? undefined}
						>
							{row.time}
						</time>
					</li>
				{/each}
			</ul>
			<p class="text-sm">
				Total length {formatDuration(appState.circumstances.durationSeconds)}
				{#if appState.circumstances.centralDurationSeconds}
					· Central
					{formatDuration(appState.circumstances.centralDurationSeconds)}
				{/if}
			</p>
			{#if detailsHref}
				<Button href={detailsHref} color="primary" class="w-full"
					>More info</Button
				>
			{/if}
		</div>
	{:else if appState.circumstances}
		<div class:opacity-40={showOverlay} aria-busy={showOverlay}>
			<Alert color="blue">
				This eclipse is not visible from the selected location.
			</Alert>
			{#if detailsHref}
				<Button href={detailsHref} color="alternative" class="mt-3 w-full"
					>More info</Button
				>
			{/if}
		</div>
	{:else if !appState.location}
		<Alert color="yellow"
			>Pick a location to compute start, end, and coverage.</Alert
		>
	{:else}
		<div class="min-h-48" aria-busy={showOverlay}></div>
	{/if}

	{#if showOverlay}
		<div
			class="absolute inset-0 z-10 flex items-center justify-center bg-white/55 dark:bg-gray-900/55"
			role="status"
			aria-live="polite"
		>
			<Spinner />
			<span class="sr-only">Updating eclipse details</span>
		</div>
	{/if}
</Card>
