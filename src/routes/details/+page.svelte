<script lang="ts">
import { Alert, Button, Card, Progressbar, Spinner } from "flowbite-svelte";
import { untrack } from "svelte";
import { page } from "$app/state";
import AltitudeChart from "$lib/components/AltitudeChart.svelte";
import AzimuthChart from "$lib/components/AzimuthChart.svelte";
import CompareLocationsCard from "$lib/components/CompareLocationsCard.svelte";
import CopyLinkButton from "$lib/components/CopyLinkButton.svelte";
import CoverageDisk from "$lib/components/CoverageDisk.svelte";
import CoverageScrubber from "$lib/components/CoverageScrubber.svelte";
import FavoriteButton from "$lib/components/FavoriteButton.svelte";
import NowModeCard from "$lib/components/NowModeCard.svelte";
import ObscurationChart from "$lib/components/ObscurationChart.svelte";
import PathPreviewMap from "$lib/components/PathPreviewMap.svelte";
import StagesCard from "$lib/components/StagesCard.svelte";
import { deviceTimeZone, parseDetailsQuery } from "$lib/details-query";
import {
	formatContactLabel,
	formatDaylightPhase,
	formatEclipseType,
	formatGamma,
	formatLookDirection,
	formatMoonSunRatio,
	formatPathStatus,
	formatPathWidthKm,
} from "$lib/eclipse/detail-format";
import {
	formatContactTime,
	formatDuration,
	formatInstant,
	formatIsoDate,
	formatPercent,
} from "$lib/eclipse/time";
import { m } from "$lib/paraglide/messages.js";
import { localizeHref } from "$lib/paraglide/runtime";
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
		error = err instanceof Error ? err.message : m.errorFailedLoadDetails();
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
			<p class="text-xs text-gray-500 dark:text-gray-400">{m.pageEyebrow()}</p>
			<h1 class="text-xl font-semibold">
				{query ? formatIsoDate(query.date) : m.missingSelection()}
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
			<Button color="alternative" size="sm" href={localizeHref("/")}>
				{m.backToMap()}
			</Button>
		</div>
	</div>

	{#if !query}
		<Alert color="yellow">{m.missingQueryAlert()}</Alert>
		<Button href={localizeHref("/")}>{m.chooseLocation()}</Button>
	{:else}
		<div class="relative flex w-full flex-col gap-4">
			{#if details}
				<div
					class="grid grid-cols-2 gap-4 transition-opacity lg:grid-cols-4"
					class:opacity-40={loading}
					aria-busy={loading}
				>
					{#if details.visible}
						<NowModeCard
							contacts={details.contacts}
							localType={details.localType}
							series={details.series ?? []}
						/>
					{/if}

					<Card class="w-full p-2 max-w-none" size="xl">
						<p class="mb-2 text-sm font-medium">{m.observerHeading()}</p>
						<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
							<dt class="text-gray-500 dark:text-gray-400">{m.place()}</dt>
							<dd class="truncate" title={details.location.label}>
								{details.location.label ||
									formatCoordinates(
										details.location.lat,
										details.location.lon,
									)}
							</dd>
							<dt class="text-gray-500 dark:text-gray-400">
								{m.coordinates()}
							</dt>
							<dd class="font-medium tabular-nums">
								{formatCoordinates(
									details.location.lat,
									details.location.lon,
								)}
							</dd>
							<dt class="text-gray-500 dark:text-gray-400">{m.elevation()}</dt>
							<dd class="tabular-nums">
								{m.elevationMeters({
									meters: Math.round(details.location.height),
								})}
							</dd>
							<dt class="text-gray-500 dark:text-gray-400">{m.timezone()}</dt>
							<dd>{timeZone}</dd>
						</dl>
					</Card>

					<Card class="w-full p-2 max-w-none" size="xl">
						<p class="mb-2 text-sm font-medium">{m.daylightHeading()}</p>
						<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
							<dt class="text-gray-500 dark:text-gray-400">{m.sunrise()}</dt>
							<dd class="tabular-nums">
								{formatInstant(details.sunriseIso)}
							</dd>
							<dt class="text-gray-500 dark:text-gray-400">{m.sunset()}</dt>
							<dd class="tabular-nums">
								{formatInstant(details.sunsetIso)}
							</dd>
							<dt class="text-gray-500 dark:text-gray-400">{m.greatest()}</dt>
							<dd class="tabular-nums">
								{formatContactTime(details.contacts.max)}
							</dd>
						</dl>
						{#if (details.contactDaylight ?? []).length > 0}
							<ul
								class="mt-3 divide-y divide-gray-200 text-sm dark:divide-gray-700"
								aria-label={m.contactDaylightAria()}
							>
								{#each details.contactDaylight ?? [] as row (row.key)}
									<li
										class="flex items-baseline justify-between gap-3 py-1 first:pt-0 last:pb-0"
									>
										<span class="text-gray-500 dark:text-gray-400"
											>{formatContactLabel(row.key, details.localType)}</span
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
						<p class="mb-2 text-sm font-medium">{m.whereToLook()}</p>
						<p class="text-base font-medium">
							{formatLookDirection(
								details.lookDirectionCode,
								details.lookAltitudeDeg,
							)}
						</p>
						{#if details.lookAzimuthDeg !== null}
							<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
								{m.lookAzimuthAltitude({
									azimuth: details.lookAzimuthDeg.toFixed(1),
									altitude: (details.lookAltitudeDeg ?? 0).toFixed(1),
								})}
							</p>
						{/if}
					</Card>

					<Card class="w-full p-2 max-w-none" size="xl">
						<p class="mb-2 text-sm font-medium">{m.pathHeading()}</p>
						<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
							<dt class="text-gray-500 dark:text-gray-400">{m.status()}</dt>
							<dd class="font-medium">
								{formatPathStatus(details.pathStatus)}
							</dd>
							<dt class="text-gray-500 dark:text-gray-400">{m.pathWidth()}</dt>
							<dd class="tabular-nums">
								{formatPathWidthKm(details.pathWidthMeters)}
							</dd>
						</dl>
						<p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
							{m.pathWidthHint()}
						</p>
					</Card>

					<Card class="w-full p-2 max-w-none col-span-2" size="xl">
						<p class="mb-2 text-sm font-medium">{m.coverageHeading()}</p>
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
										<p class="mb-1 text-sm">{m.coverageSunArea()}</p>
										<Progressbar
											progress={details.obscuration * 100}
											labelInside
											size="h-4"
										/>
										<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
											{m.magnitudeOfDiameter({
												percent: formatPercent(details.magnitude),
											})}
										</p>
									</div>
									<p class="text-sm">
										{m.totalLength({
											duration: formatDuration(details.durationSeconds),
										})}
										{#if details.centralDurationSeconds}
											·
											{m.centralDuration({
												duration: formatDuration(
													details.centralDurationSeconds,
												),
											})}
										{/if}
									</p>
								</div>
							</div>
						{:else}
							<p class="text-sm text-gray-500 dark:text-gray-400">
								{m.noLocalCoverage()}
							</p>
						{/if}
					</Card>

					<Card class="w-full p-2 max-w-none col-span-2" size="xl">
						<p class="mb-2 text-sm font-medium">{m.globalFacts()}</p>
						{#if details.global}
							{@const g = details.global}
							<dl
								class="grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-2"
							>
								<div class="grid grid-cols-[auto_1fr] gap-x-4">
									<dt class="text-gray-500 dark:text-gray-400">
										{m.typeHeading()}
									</dt>
									<dd class="font-medium">{formatEclipseType(g.type)}</dd>
								</div>
								<div class="grid grid-cols-[auto_1fr] gap-x-4">
									<dt class="text-gray-500 dark:text-gray-400">{m.saros()}</dt>
									<dd class="tabular-nums">{g.saros}</dd>
								</div>
								<div class="grid grid-cols-[auto_1fr] gap-x-4">
									<dt class="text-gray-500 dark:text-gray-400">{m.gamma()}</dt>
									<dd class="tabular-nums">{formatGamma(g.gamma)}</dd>
								</div>
								<div class="grid grid-cols-[auto_1fr] gap-x-4">
									<dt class="text-gray-500 dark:text-gray-400">
										{m.maxMagnitude()}
									</dt>
									<dd class="tabular-nums">
										{formatPercent(g.maxMagnitude)}
									</dd>
								</div>
								<div class="grid grid-cols-[auto_1fr] gap-x-4">
									<dt class="text-gray-500 dark:text-gray-400">
										{m.maxObscuration()}
									</dt>
									<dd class="tabular-nums">
										{formatPercent(g.maxObscuration)}
									</dd>
								</div>
								<div class="grid grid-cols-[auto_1fr] gap-x-4">
									<dt class="text-gray-500 dark:text-gray-400">
										{m.moonSunRatio()}
									</dt>
									<dd class="tabular-nums">
										{formatMoonSunRatio(g.maxMoonSunRatio)}
									</dd>
								</div>
								<div class="grid grid-cols-[auto_1fr] gap-x-4">
									<dt class="text-gray-500 dark:text-gray-400">
										{m.maxDuration()}
									</dt>
									<dd class="tabular-nums">
										{formatDuration(g.maxDurationSeconds)}
									</dd>
								</div>
								<div class="grid grid-cols-[auto_1fr] gap-x-4">
									<dt class="text-gray-500 dark:text-gray-400">
										{m.maxCentral()}
									</dt>
									<dd class="tabular-nums">
										{formatDuration(g.maxCentralDurationSeconds)}
									</dd>
								</div>
								<div class="grid grid-cols-[auto_1fr] gap-x-4">
									<dt class="text-gray-500 dark:text-gray-400">
										{m.pathWidth()}
									</dt>
									<dd class="tabular-nums">
										{formatPathWidthKm(g.pathWidthMeters)}
									</dd>
								</div>
								<div class="grid grid-cols-[auto_1fr] gap-x-4">
									<dt class="text-gray-500 dark:text-gray-400">
										{m.greatest()}
									</dt>
									<dd class="tabular-nums">
										{formatCoordinates(g.greatestLat, g.greatestLon)}
									</dd>
								</div>
								<div class="grid grid-cols-[auto_1fr] gap-x-4">
									<dt class="text-gray-500 dark:text-gray-400">
										{m.greatestTime()}
									</dt>
									<dd class="tabular-nums">
										{formatInstant(g.greatestIso)}
									</dd>
								</div>
							</dl>
						{:else}
							<p class="text-sm text-gray-500 dark:text-gray-400">
								{m.noGlobalFacts()}
							</p>
						{/if}
					</Card>

					<CompareLocationsCard date={details.date} primary={details} />

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
						<p class="mb-2 text-sm font-medium">{m.pathPreview()}</p>
						<p class="mb-3 text-xs text-gray-500 dark:text-gray-400">
							{m.pathPreviewHint()}
						</p>
						<PathPreviewMap location={details.location} {paths} />
					</Card>

					<Card class="w-full p-2 max-w-none col-span-2" size="xl">
						<p class="mb-2 text-sm font-medium">{m.sunAltitude()}</p>
						<p class="mb-3 text-xs text-gray-500 dark:text-gray-400">
							{m.sunAltitudeHint()}
						</p>
						<AltitudeChart
							samples={details.series ?? []}
							contacts={details.contacts}
							localType={details.localType}
						/>
					</Card>

					<Card class="w-full p-2 max-w-none col-span-2" size="xl">
						<p class="mb-2 text-sm font-medium">{m.sunAzimuth()}</p>
						<p class="mb-3 text-xs text-gray-500 dark:text-gray-400">
							{m.sunAzimuthHint()}
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
						<p class="mb-2 text-sm font-medium">{m.obscurationHeading()}</p>
						<p class="mb-3 text-xs text-gray-500 dark:text-gray-400">
							{m.obscurationHint()}
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
				<Alert color="blue">{m.noDetailsAvailable()}</Alert>
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
					<span class="sr-only">{m.loadingDetailsAria()}</span>
				</div>
			{/if}
		</div>
	{/if}
</div>
