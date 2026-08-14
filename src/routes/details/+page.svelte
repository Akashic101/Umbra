<script lang="ts">
import { Alert, Button, Card, Progressbar, Spinner } from "flowbite-svelte";
import { untrack } from "svelte";
import { page } from "$app/state";
import AltitudeChart from "$lib/components/AltitudeChart.svelte";
import AzimuthChart from "$lib/components/AzimuthChart.svelte";
import CopyLinkButton from "$lib/components/CopyLinkButton.svelte";
import CoverageDisk from "$lib/components/CoverageDisk.svelte";
import CoverageScrubber from "$lib/components/CoverageScrubber.svelte";
import FavoriteButton from "$lib/components/FavoriteButton.svelte";
import ObscurationChart from "$lib/components/ObscurationChart.svelte";
import PathPreviewMap from "$lib/components/PathPreviewMap.svelte";
import StagesCard from "$lib/components/StagesCard.svelte";
import { deviceTimeZone, parseDetailsQuery } from "$lib/details-query";
import {
	formatDaylightPhase,
	formatEclipseType,
	formatGamma,
	formatMoonSunRatio,
	formatPathStatus,
	formatPathWidthKm,
} from "$lib/eclipse/detail-format";
import {
	formatContactTime,
	formatDuration,
	formatInstant,
	formatPercent,
} from "$lib/eclipse/time";
import { eclipseService } from "$lib/services/eclipse";
import { formatCoordinates } from "$lib/services/geocoding";
import type { EclipsePaths, ObserverEclipseDetails } from "$lib/types";

let details = $state.raw<ObserverEclipseDetails | null>(null);
let paths = $state.raw<EclipsePaths | null>(null);
let loading = $state(true);
let error = $state<string | null>(null);
let loadToken = 0;

const query = $derived(parseDetailsQuery(page.url.search));
const timeZone = deviceTimeZone();

// Depend only on search; untrack async work so loading/details/error writes
// do not re-enter the effect (which previously left loading stuck true).
$effect(() => {
	const search = page.url.search;
	untrack(() => {
		void load(search);
	});
	return () => {
		loadToken += 1;
	};
});

async function load(search: string): Promise<void> {
	const parsed = parseDetailsQuery(search);
	const token = ++loadToken;
	if (!parsed) {
		details = null;
		paths = null;
		error = null;
		loading = false;
		return;
	}
	loading = true;
	error = null;
	try {
		// Load details first so a slow/restarted path worker cannot block the page.
		const next = await eclipseService.getObserverDetails(
			parsed.date,
			parsed.location,
		);
		if (token !== loadToken) {
			return;
		}
		details = next;
		error = null;
		loading = false;

		const nextPaths = await eclipseService
			.getPaths(parsed.date)
			.catch(() => null);
		if (token !== loadToken) {
			return;
		}
		paths = nextPaths;
	} catch (err) {
		if (token !== loadToken) {
			return;
		}
		error =
			err instanceof Error ? err.message : "Failed to load eclipse details.";
		details = null;
		paths = null;
		loading = false;
	}
}
</script>

<div
	class="mx-auto flex h-full w-full flex-col gap-4 overflow-y-auto px-4 pb-10 pt-4 sm:px-6"
>
	<div class="flex w-full items-center justify-between gap-3">
		<div class="min-w-0">
			<p class="text-xs text-gray-500 dark:text-gray-400">Eclipse details</p>
			<h1 class="text-xl font-semibold">
				{query?.date ?? "Missing selection"}
			</h1>
			{#if query}
				{@const locationText =
					query.location.label ||
					formatCoordinates(query.location.lat, query.location.lon)}
				<p
					class="truncate text-sm text-gray-500 dark:text-gray-400"
					title={locationText}
				>
					{locationText}
				</p>
			{/if}
		</div>
		<div class="flex shrink-0 items-center gap-2">
			{#if query}
				<CopyLinkButton />
				<FavoriteButton date={query.date} location={query.location} />
			{/if}
			<Button color="alternative" size="sm" href="/">Back to map</Button>
		</div>
	</div>

	{#if !query}
		<Alert color="yellow">
			Open this page from an eclipse’s Details tab so location and date are
			included in the URL.
		</Alert>
		<Button href="/">Choose a location</Button>
	{:else}
		<div class="relative flex w-full flex-col gap-4">
			{#if details}
				<div
					class="grid grid-cols-2 gap-4 transition-opacity lg:grid-cols-4"
					class:opacity-40={loading}
					aria-busy={loading}
				>
					<Card class="w-full p-2 max-w-none" size="xl">
						<p class="mb-2 text-sm font-medium">Observer</p>
						<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
							<dt class="text-gray-500 dark:text-gray-400">Place</dt>
							<dd class="truncate" title={details.location.label}>
								{details.location.label ||
									formatCoordinates(
										details.location.lat,
										details.location.lon,
									)}
							</dd>
							<dt class="text-gray-500 dark:text-gray-400">Coordinates</dt>
							<dd class="font-medium tabular-nums">
								{formatCoordinates(
									details.location.lat,
									details.location.lon,
								)}
							</dd>
							<dt class="text-gray-500 dark:text-gray-400">Elevation</dt>
							<dd class="tabular-nums">
								{Math.round(details.location.height)}
								m
							</dd>
							<dt class="text-gray-500 dark:text-gray-400">Timezone</dt>
							<dd>{timeZone}</dd>
						</dl>
					</Card>

					<Card class="w-full p-2 max-w-none" size="xl">
						<p class="mb-2 text-sm font-medium">Daylight</p>
						<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
							<dt class="text-gray-500 dark:text-gray-400">Sunrise</dt>
							<dd class="tabular-nums">
								{formatInstant(details.sunriseIso)}
							</dd>
							<dt class="text-gray-500 dark:text-gray-400">Sunset</dt>
							<dd class="tabular-nums">
								{formatInstant(details.sunsetIso)}
							</dd>
							<dt class="text-gray-500 dark:text-gray-400">Greatest</dt>
							<dd class="tabular-nums">
								{formatContactTime(details.contacts.max)}
							</dd>
						</dl>
						{#if (details.contactDaylight ?? []).length > 0}
							<ul
								class="mt-3 divide-y divide-gray-200 text-sm dark:divide-gray-700"
								aria-label="Contact daylight"
							>
								{#each details.contactDaylight ?? [] as row (row.key)}
									<li
										class="flex items-baseline justify-between gap-3 py-1 first:pt-0 last:pb-0"
									>
										<span class="text-gray-500 dark:text-gray-400"
											>{row.label}</span
										>
										<span class="shrink-0 font-medium"
											>{formatDaylightPhase(row.phase)}</span
										>
									</li>
								{/each}
							</ul>
						{/if}
					</Card>

					<Card class="w-full p-2 max-w-none" size="xl">
						<p class="mb-2 text-sm font-medium">Where to look</p>
						<p class="text-base font-medium">{details.lookDirection}</p>
						{#if details.lookAzimuthDeg !== null}
							<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
								Azimuth {details.lookAzimuthDeg.toFixed(1)}° · altitude
								{(details.lookAltitudeDeg ?? 0).toFixed(1)}° (apparent, at
								greatest eclipse)
							</p>
						{/if}
					</Card>

					<Card class="w-full p-2 max-w-none" size="xl">
						<p class="mb-2 text-sm font-medium">Path</p>
						<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
							<dt class="text-gray-500 dark:text-gray-400">Status</dt>
							<dd class="font-medium">
								{formatPathStatus(details.pathStatus)}
							</dd>
							<dt class="text-gray-500 dark:text-gray-400">Path width</dt>
							<dd class="tabular-nums">
								{formatPathWidthKm(details.pathWidthMeters)}
							</dd>
						</dl>
						<p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
							Local umbra/antumbra band width at this place (not the global
							maximum).
						</p>
					</Card>

					<Card class="w-full p-2 max-w-none col-span-2" size="xl">
						<p class="mb-2 text-sm font-medium">Coverage</p>
						{#if details.visible}
							<div
								class="flex flex-col items-center gap-3 sm:flex-row sm:items-start"
							>
								<CoverageDisk
									size="lg"
									obscuration={details.obscuration}
									magnitude={details.magnitude}
									moonSunRatio={details.moonSunRatio}
									localType={details.localType}
								/>
								<div class="w-full min-w-0 flex-1 space-y-2">
									<div>
										<p class="mb-1 text-sm">Coverage (Sun area)</p>
										<Progressbar
											progress={details.obscuration * 100}
											labelInside
											size="h-4"
										/>
										<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
											Magnitude {formatPercent(details.magnitude)} of the Sun's
											diameter
										</p>
									</div>
									<p class="text-sm">
										Total length {formatDuration(details.durationSeconds)}
										{#if details.centralDurationSeconds}
											· Central
											{formatDuration(details.centralDurationSeconds)}
										{/if}
									</p>
								</div>
							</div>
						{:else}
							<p class="text-sm text-gray-500 dark:text-gray-400">
								No local eclipse coverage at this location.
							</p>
						{/if}
					</Card>

					<Card class="w-full p-2 max-w-none col-span-2" size="xl">
						<p class="mb-2 text-sm font-medium">Global facts</p>
						{#if details.global}
							{@const g = details.global}
							<dl
								class="grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-2"
							>
								<div class="grid grid-cols-[auto_1fr] gap-x-4">
									<dt class="text-gray-500 dark:text-gray-400">Type</dt>
									<dd class="font-medium">{formatEclipseType(g.type)}</dd>
								</div>
								<div class="grid grid-cols-[auto_1fr] gap-x-4">
									<dt class="text-gray-500 dark:text-gray-400">Saros</dt>
									<dd class="tabular-nums">{g.saros}</dd>
								</div>
								<div class="grid grid-cols-[auto_1fr] gap-x-4">
									<dt class="text-gray-500 dark:text-gray-400">Gamma</dt>
									<dd class="tabular-nums">{formatGamma(g.gamma)}</dd>
								</div>
								<div class="grid grid-cols-[auto_1fr] gap-x-4">
									<dt class="text-gray-500 dark:text-gray-400">
										Max magnitude
									</dt>
									<dd class="tabular-nums">
										{formatPercent(g.maxMagnitude)}
									</dd>
								</div>
								<div class="grid grid-cols-[auto_1fr] gap-x-4">
									<dt class="text-gray-500 dark:text-gray-400">
										Max obscuration
									</dt>
									<dd class="tabular-nums">
										{formatPercent(g.maxObscuration)}
									</dd>
								</div>
								<div class="grid grid-cols-[auto_1fr] gap-x-4">
									<dt class="text-gray-500 dark:text-gray-400">
										Moon/Sun ratio
									</dt>
									<dd class="tabular-nums">
										{formatMoonSunRatio(g.maxMoonSunRatio)}
									</dd>
								</div>
								<div class="grid grid-cols-[auto_1fr] gap-x-4">
									<dt class="text-gray-500 dark:text-gray-400">
										Max duration
									</dt>
									<dd class="tabular-nums">
										{formatDuration(g.maxDurationSeconds)}
									</dd>
								</div>
								<div class="grid grid-cols-[auto_1fr] gap-x-4">
									<dt class="text-gray-500 dark:text-gray-400">
										Max central
									</dt>
									<dd class="tabular-nums">
										{formatDuration(g.maxCentralDurationSeconds)}
									</dd>
								</div>
								<div class="grid grid-cols-[auto_1fr] gap-x-4">
									<dt class="text-gray-500 dark:text-gray-400">
										Path width
									</dt>
									<dd class="tabular-nums">
										{formatPathWidthKm(g.pathWidthMeters)}
									</dd>
								</div>
								<div class="grid grid-cols-[auto_1fr] gap-x-4">
									<dt class="text-gray-500 dark:text-gray-400">Greatest</dt>
									<dd class="tabular-nums">
										{formatCoordinates(g.greatestLat, g.greatestLon)}
									</dd>
								</div>
								<div class="grid grid-cols-[auto_1fr] gap-x-4">
									<dt class="text-gray-500 dark:text-gray-400">
										Greatest time
									</dt>
									<dd class="tabular-nums">
										{formatInstant(g.greatestIso)}
									</dd>
								</div>
							</dl>
						{:else}
							<p class="text-sm text-gray-500 dark:text-gray-400">
								No global catalog facts available.
							</p>
						{/if}
					</Card>

					<StagesCard
						contacts={details.contacts}
						localType={details.localType}
					/>

					<CoverageScrubber
						series={details.series ?? []}
						localType={details.localType}
						contacts={details.contacts}
					/>

					<Card
						class="col-span-2 w-full max-w-none p-2 lg:col-span-2"
						size="xl"
					>
						<p class="mb-2 text-sm font-medium">Path preview</p>
						<p class="mb-3 text-xs text-gray-500 dark:text-gray-400">
							Penumbra, umbra/antumbra, and centerline with your observer pin
						</p>
						<PathPreviewMap location={details.location} {paths} />
					</Card>

					<Card class="w-full p-2 max-w-none col-span-2" size="xl">
						<p class="mb-2 text-sm font-medium">Sun altitude</p>
						<p class="mb-3 text-xs text-gray-500 dark:text-gray-400">
							Apparent altitude from first to fourth contact
						</p>
						<AltitudeChart
							samples={details.series ?? []}
							contacts={details.contacts}
							localType={details.localType}
						/>
					</Card>

					<Card class="w-full p-2 max-w-none col-span-2" size="xl">
						<p class="mb-2 text-sm font-medium">Sun azimuth</p>
						<p class="mb-3 text-xs text-gray-500 dark:text-gray-400">
							Apparent azimuth from first to fourth contact (0–360°)
						</p>
						<AzimuthChart
							samples={details.series ?? []}
							contacts={details.contacts}
							localType={details.localType}
						/>
					</Card>

					<Card
						class="w-full p-2 max-w-none col-span-2 lg:col-span-4"
						size="xl"
					>
						<p class="mb-2 text-sm font-medium">Obscuration</p>
						<p class="mb-3 text-xs text-gray-500 dark:text-gray-400">
							Sun-area coverage from first to fourth contact
						</p>
						<ObscurationChart
							samples={details.series ?? []}
							contacts={details.contacts}
							localType={details.localType}
						/>
					</Card>
				</div>
			{:else if !loading && error}
				<Alert color="red">{error}</Alert>
			{:else if !loading}
				<Alert color="blue">No details available for this selection.</Alert>
			{:else}
				<div class="min-h-64" aria-busy="true"></div>
			{/if}

			{#if loading}
				<div
					class="absolute inset-0 z-10 flex items-center justify-center bg-white/55 dark:bg-gray-900/55"
					role="status"
					aria-live="polite"
				>
					<Spinner />
					<span class="sr-only">Loading details</span>
				</div>
			{/if}
		</div>
	{/if}
</div>
