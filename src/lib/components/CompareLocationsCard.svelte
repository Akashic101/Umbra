<script lang="ts">
import {
	Badge,
	Button,
	Card,
	Listgroup,
	ListgroupItem,
	Search,
	Spinner,
} from "flowbite-svelte";
import { SearchOutline } from "flowbite-svelte-icons";
import { untrack } from "svelte";
import { serializeDetailsQuery } from "$lib/details-query";
import { formatLocalTypeTitle } from "$lib/eclipse/detail-format";
import { haversineKm, samePlace } from "$lib/eclipse/geo";
import { formatDuration, formatPercent } from "$lib/eclipse/time";
import { m } from "$lib/paraglide/messages.js";
import { localizeHref } from "$lib/paraglide/runtime";
import { eclipseService } from "$lib/services/eclipse";
import { elevation } from "$lib/services/elevation";
import { formatCoordinates, geocoding } from "$lib/services/geocoding";
import type {
	ObserverEclipseDetails,
	ObserverLocation,
	Place,
} from "$lib/types";

const PRIMARY_ID = "primary";
const MAX_EXTRAS = 2;

type ExtraRow = {
	id: string;
	location: ObserverLocation;
	details: ObserverEclipseDetails | null;
	loading: boolean;
	error: string | null;
};

type DisplayRow = {
	id: string;
	isPrimary: boolean;
	label: string;
	distance: string | null;
	type: string;
	coverage: string;
	duration: string;
	central: string;
	altitude: string;
	loading: boolean;
	openHref: string | null;
	bestCoverage: boolean;
	bestCentral: boolean;
};

let {
	date,
	primary,
}: {
	date: string;
	primary: ObserverEclipseDetails;
} = $props();

let extras = $state<ExtraRow[]>([]);
let searchQuery = $state("");
let searchResults = $state<Place[]>([]);
let searchError = $state<string | null>(null);
let searching = $state(false);
let addToken = 0;

const atMax = $derived(extras.length >= MAX_EXTRAS);

const canAddGreatest = $derived.by(() => {
	const g = primary.global;
	if (!g || atMax) {
		return false;
	}
	const greatest = { lat: g.greatestLat, lon: g.greatestLon };
	if (samePlace(greatest, primary.location)) {
		return false;
	}
	return !extras.some((row) => samePlace(greatest, row.location));
});

const displayRows = $derived.by((): DisplayRow[] => {
	const candidates: {
		id: string;
		obscuration: number;
		central: number;
	}[] = [];

	if (primary.visible) {
		candidates.push({
			id: PRIMARY_ID,
			obscuration: primary.obscuration,
			central: primary.centralDurationSeconds,
		});
	}
	for (const row of extras) {
		if (row.loading || row.error || !row.details?.visible) {
			continue;
		}
		candidates.push({
			id: row.id,
			obscuration: row.details.obscuration,
			central: row.details.centralDurationSeconds,
		});
	}

	let bestCoverageIds = new Set<string>();
	let bestCentralIds = new Set<string>();
	if (candidates.length > 0) {
		const maxCov = Math.max(...candidates.map((c) => c.obscuration));
		bestCoverageIds = new Set(
			candidates.filter((c) => c.obscuration === maxCov).map((c) => c.id),
		);
		const maxCen = Math.max(...candidates.map((c) => c.central));
		if (maxCen > 0) {
			bestCentralIds = new Set(
				candidates.filter((c) => c.central === maxCen).map((c) => c.id),
			);
		}
	}

	const rows: DisplayRow[] = [
		toDisplayRow({
			id: PRIMARY_ID,
			isPrimary: true,
			location: primary.location,
			details: primary,
			loading: false,
			error: null,
			bestCoverage: bestCoverageIds.has(PRIMARY_ID),
			bestCentral: bestCentralIds.has(PRIMARY_ID),
		}),
	];

	for (const extra of extras) {
		rows.push(
			toDisplayRow({
				id: extra.id,
				isPrimary: false,
				location: extra.location,
				details: extra.details,
				loading: extra.loading,
				error: extra.error,
				bestCoverage: bestCoverageIds.has(extra.id),
				bestCentral: bestCentralIds.has(extra.id),
			}),
		);
	}

	return rows;
});

$effect(() => {
	date;
	primary.location.lat;
	primary.location.lon;
	untrack(() => {
		addToken += 1;
		extras = [];
		searchQuery = "";
		searchResults = [];
		searchError = null;
	});
});

function placeLabel(location: ObserverLocation): string {
	return location.label || formatCoordinates(location.lat, location.lon);
}

function formatAltitude(deg: number | null): string {
	if (deg === null || !Number.isFinite(deg)) {
		return m.emDash();
	}
	return `${Math.round(deg)}°`;
}

function toDisplayRow(input: {
	id: string;
	isPrimary: boolean;
	location: ObserverLocation;
	details: ObserverEclipseDetails | null;
	loading: boolean;
	error: string | null;
	bestCoverage: boolean;
	bestCentral: boolean;
}): DisplayRow {
	const { id, isPrimary, location, details, loading, error } = input;
	let type: string = m.emDash();
	let coverage: string = m.emDash();
	let duration: string = m.emDash();
	let central: string = m.emDash();
	let altitude: string = m.emDash();

	if (loading) {
		type = m.compareLoading();
	} else if (error) {
		type = error;
	} else if (details) {
		if (!details.visible) {
			type = m.compareNotVisible();
			coverage = m.compareNotVisible();
		} else {
			type = formatLocalTypeTitle(details.localType);
			coverage = formatPercent(details.obscuration);
			duration = formatDuration(details.durationSeconds);
			central =
				details.centralDurationSeconds > 0
					? formatDuration(details.centralDurationSeconds)
					: m.emDash();
			altitude = formatAltitude(details.lookAltitudeDeg);
		}
	}

	const distanceKm = isPrimary
		? null
		: Math.round(haversineKm(primary.location, location));

	return {
		id,
		isPrimary,
		label: placeLabel(location),
		distance:
			distanceKm === null
				? null
				: m.compareDistanceKm({ km: String(distanceKm) }),
		type,
		coverage,
		duration,
		central,
		altitude,
		loading,
		openHref: isPrimary
			? null
			: localizeHref(`/details?${serializeDetailsQuery({ date, location })}`),
		bestCoverage: input.bestCoverage,
		bestCentral: input.bestCentral,
	};
}

async function onSearch(event: Event): Promise<void> {
	event.preventDefault();
	searchError = null;
	searching = true;
	try {
		searchResults = await geocoding.search(searchQuery);
		if (!searchResults.length) {
			searchError = m.errorNoPlacesFound();
		}
	} catch (err) {
		searchResults = [];
		searchError =
			err instanceof Error ? err.message : m.errorPlaceSearchFailed();
	} finally {
		searching = false;
	}
}

async function pickPlace(place: Place): Promise<void> {
	searchResults = [];
	await addLocation({
		lat: place.lat,
		lon: place.lon,
		height: 0,
		label: place.label,
	});
}

async function addGreatest(): Promise<void> {
	const g = primary.global;
	if (!g) {
		return;
	}
	await addLocation({
		lat: g.greatestLat,
		lon: g.greatestLon,
		height: 0,
		label: m.compareGreatest(),
	});
}

async function addLocation(location: ObserverLocation): Promise<void> {
	if (
		samePlace(location, primary.location) ||
		extras.some((row) => samePlace(location, row.location))
	) {
		searchError = m.compareAlreadyAdded();
		return;
	}
	if (extras.length >= MAX_EXTRAS) {
		searchError = m.compareMaxReached();
		return;
	}

	const id = crypto.randomUUID();
	const token = addToken;
	extras = [
		...extras,
		{ id, location, details: null, loading: true, error: null },
	];
	searchQuery = "";
	searchResults = [];
	searchError = null;

	try {
		const meters = await elevation.getMeters(location.lat, location.lon);
		if (token !== addToken) {
			return;
		}
		const resolved: ObserverLocation = {
			...location,
			height: meters ?? location.height ?? 0,
		};
		const details = await eclipseService.getObserverDetails(date, resolved);
		if (token !== addToken) {
			return;
		}
		extras = extras.map((row) =>
			row.id === id
				? {
						...row,
						location: resolved,
						details,
						loading: false,
						error: null,
					}
				: row,
		);
	} catch {
		if (token !== addToken) {
			return;
		}
		extras = extras.map((row) =>
			row.id === id ? { ...row, loading: false, error: m.compareError() } : row,
		);
	}
}

function removeExtra(id: string): void {
	extras = extras.filter((row) => row.id !== id);
}
</script>

{#snippet rowBadges(row: DisplayRow)}
	{#if row.isPrimary}
		<Badge color="blue" class="shrink-0">{m.compareYou()}</Badge>
	{/if}
	{#if row.bestCoverage}
		<Badge color="green" class="shrink-0">{m.compareBestCoverage()}</Badge>
	{/if}
	{#if row.bestCentral}
		<Badge color="yellow" class="shrink-0">{m.compareBestCentral()}</Badge>
	{/if}
{/snippet}

{#snippet rowActions(row: DisplayRow)}
	{#if !row.isPrimary}
		<div class="flex flex-wrap items-center gap-2">
			{#if row.openHref}
				<Button color="alternative" size="xs" href={row.openHref}>
					{m.compareOpen()}
				</Button>
			{/if}
			<Button
				color="alternative"
				size="xs"
				onclick={() => removeExtra(row.id)}
				aria-label={m.compareRemoveAria()}
			>
				{m.compareRemoveAria()}
			</Button>
		</div>
	{/if}
{/snippet}

<Card class="w-full p-2 max-w-none col-span-2 lg:col-span-4" size="xl">
	<p class="mb-2 text-sm font-medium">{m.compareHeading()}</p>
	<p class="mb-3 text-xs text-gray-500 dark:text-gray-400">{m.compareHint()}</p>

	<form class="mb-3 flex flex-col gap-2" onsubmit={onSearch}>
		<div class="relative flex flex-col gap-2">
			<div class="flex flex-wrap gap-2">
				<div class="flex min-w-0 flex-1 gap-2">
					<Search
						bind:value={searchQuery}
						placeholder={m.compareSearchPlaceholder()}
						class="w-full"
						clearable
						aria-label={m.compareSearchAria()}
						disabled={atMax}
					/>
					<Button
						type="submit"
						color="primary"
						class="shrink-0"
						disabled={atMax || searching}
						aria-label={m.compareAddAria()}
					>
						{#if searching}
							<Spinner size="4" />
						{:else}
							<SearchOutline class="h-4 w-4" />
						{/if}
						<span class="sr-only">{m.compareAddAria()}</span>
					</Button>
				</div>
				{#if canAddGreatest}
					<Button
						type="button"
						color="alternative"
						class="shrink-0"
						onclick={addGreatest}
					>
						{m.compareGreatest()}
					</Button>
				{/if}
			</div>
			{#if searchResults.length}
				<Listgroup
					class="absolute top-full left-0 z-20 mt-1 max-h-40 w-full overflow-auto shadow-md"
				>
					{#each searchResults as place, index (place.label + index)}
						<ListgroupItem>
							<button
								type="button"
								class="w-full text-left"
								onclick={() => pickPlace(place)}
							>
								{place.label}
							</button>
						</ListgroupItem>
					{/each}
				</Listgroup>
			{/if}
		</div>
		{#if searchError}
			<p class="text-sm text-red-600 dark:text-red-400">{searchError}</p>
		{:else if atMax}
			<p class="text-sm text-gray-500 dark:text-gray-400">
				{m.compareMaxReached()}
			</p>
		{/if}
	</form>

	<!-- Mobile: stacked cards -->
	<ul
		class="flex list-none flex-col gap-3 p-0 md:hidden"
		aria-label={m.compareTableAria()}
	>
		{#each displayRows as row (row.id)}
			<li
				class="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700"
			>
				<div class="mb-2 flex flex-wrap items-start gap-2">
					<div class="min-w-0 flex-1">
						<p class="truncate font-medium" title={row.label}>{row.label}</p>
						{#if row.distance}
							<p class="text-xs text-gray-500 dark:text-gray-400">
								{row.distance}
							</p>
						{/if}
					</div>
					{@render rowBadges(row)}
					{#if row.loading}
						<Spinner size="4" />
					{/if}
				</div>
				<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
					<dt class="text-gray-500 dark:text-gray-400">{m.compareColType()}</dt>
					<dd>{row.type}</dd>
					<dt class="text-gray-500 dark:text-gray-400">
						{m.compareColCoverage()}
					</dt>
					<dd class="tabular-nums">{row.coverage}</dd>
					<dt class="text-gray-500 dark:text-gray-400">
						{m.compareColDuration()}
					</dt>
					<dd class="tabular-nums">{row.duration}</dd>
					<dt class="text-gray-500 dark:text-gray-400">
						{m.compareColCentral()}
					</dt>
					<dd class="tabular-nums">{row.central}</dd>
					<dt class="text-gray-500 dark:text-gray-400">
						{m.compareColAltitude()}
					</dt>
					<dd class="tabular-nums">{row.altitude}</dd>
				</dl>
				{#if !row.isPrimary}
					<div class="mt-3">
						{@render rowActions(row)}
					</div>
				{/if}
			</li>
		{/each}
	</ul>

	<!-- md+: table -->
	<div class="hidden overflow-x-auto md:block">
		<table
			class="w-full min-w-[40rem] text-left text-sm"
			aria-label={m.compareTableAria()}
		>
			<thead
				class="border-b border-gray-200 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400"
			>
				<tr>
					<th class="px-2 py-2 font-medium">{m.compareColPlace()}</th>
					<th class="px-2 py-2 font-medium">{m.compareColType()}</th>
					<th class="px-2 py-2 font-medium">{m.compareColCoverage()}</th>
					<th class="px-2 py-2 font-medium">{m.compareColDuration()}</th>
					<th class="px-2 py-2 font-medium">{m.compareColCentral()}</th>
					<th class="px-2 py-2 font-medium">{m.compareColAltitude()}</th>
					<th class="px-2 py-2 font-medium">
						<span class="sr-only">{m.compareOpen()}</span>
					</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-200 dark:divide-gray-700">
				{#each displayRows as row (row.id)}
					<tr class="align-top">
						<td class="max-w-[12rem] px-2 py-2">
							<div class="flex flex-wrap items-center gap-1.5">
								<span class="truncate font-medium" title={row.label}
									>{row.label}</span
								>
								{#if row.loading}
									<Spinner size="4" />
								{/if}
								{@render rowBadges(row)}
							</div>
							{#if row.distance}
								<p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
									{row.distance}
								</p>
							{/if}
						</td>
						<td class="px-2 py-2">{row.type}</td>
						<td class="px-2 py-2 tabular-nums">{row.coverage}</td>
						<td class="px-2 py-2 tabular-nums">{row.duration}</td>
						<td class="px-2 py-2 tabular-nums">{row.central}</td>
						<td class="px-2 py-2 tabular-nums">{row.altitude}</td>
						<td class="px-2 py-2">
							{@render rowActions(row)}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</Card>
