<script lang="ts">
import { Alert, Button, Card, Progressbar, Spinner } from "flowbite-svelte";
import { untrack } from "svelte";
import { page } from "$app/state";
import CloudForecastCard from "$lib/components/CloudForecastCard.svelte";
import CopyLinkButton from "$lib/components/CopyLinkButton.svelte";
import FavoriteButton from "$lib/components/FavoriteButton.svelte";
import LunarAltitudeChart from "$lib/components/LunarAltitudeChart.svelte";
import LunarCompareLocationsCard from "$lib/components/LunarCompareLocationsCard.svelte";
import LunarCoverageScrubber from "$lib/components/LunarCoverageScrubber.svelte";
import LunarMagnitudeChart from "$lib/components/LunarMagnitudeChart.svelte";
import LunarNowModeCard from "$lib/components/LunarNowModeCard.svelte";
import LunarStagesCard from "$lib/components/LunarStagesCard.svelte";
import LunarUmbraDisk from "$lib/components/LunarUmbraDisk.svelte";
import { deviceTimeZone, parseDetailsQuery } from "$lib/details-query";
import {
	formatGamma,
	formatLookDirection,
	formatLunarContactLabel,
	formatLunarType,
	formatMoonUp,
} from "$lib/eclipse/detail-format";
import {
	formatContactTime,
	formatDuration,
	formatInstant,
	formatIsoDate,
	formatMagnitude,
} from "$lib/eclipse/time";
import { m } from "$lib/paraglide/messages.js";
import { eclipseService } from "$lib/services/eclipse";
import { formatCoordinates } from "$lib/services/geocoding";
import type { LunarContactKey, LunarObserverDetails } from "$lib/types";
import { formatElevation } from "$lib/units";
import { unitsState } from "$lib/units-state.svelte";

let details = $state.raw<LunarObserverDetails | null>(null);
let loading = $state(true);
let error = $state<string | null>(null);
let loadToken = 0;

const query = $derived(parseDetailsQuery(page.url.search));
const timeZone = deviceTimeZone();
const lunarCloudOrder: LunarContactKey[] = [
	"p1",
	"u1",
	"u2",
	"max",
	"u3",
	"u4",
	"p4",
];
const cloudContacts = $derived.by(() => {
	const c = details?.contacts;
	if (!c) {
		return [];
	}
	return lunarCloudOrder
		.map((key) => ({
			key,
			label: formatLunarContactLabel(key),
			iso: c[key],
		}))
		.filter((row) => row.iso);
});

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
		error = null;
		loading = false;
		return;
	}
	loading = true;
	error = null;
	try {
		const next = await eclipseService.getLunarObserverDetails(
			parsed.date,
			parsed.location,
		);
		if (token !== loadToken) {
			return;
		}
		details = next;
		error = null;
		loading = false;
	} catch (err) {
		if (token !== loadToken) {
			return;
		}
		error = err instanceof Error ? err.message : m.errorFailedLoadDetails();
		details = null;
		loading = false;
	}
}
</script>

<svelte:head>
	<title>{m.navLunar()} — {m.brandName()}</title>
</svelte:head>

<div
	class="mx-auto flex h-full w-full flex-col gap-4 overflow-y-auto px-4 pb-10 pt-4 sm:px-6"
>
	<div
		class="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
	>
		<div class="min-w-0">
			<p class="text-xs text-gray-500 dark:text-gray-400">
				{m.lunarPageEyebrow()}
			</p>
			<h1 class="truncate text-xl font-semibold">
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
		<div class="flex flex-wrap items-center gap-2">
			{#if query}
				<CopyLinkButton />
				<FavoriteButton
					date={query.date}
					location={query.location}
					kind="lunar"
				/>
			{/if}
			<Button color="alternative" size="sm" href="/lunar">
				{m.backToLunarMap()}
			</Button>
		</div>
	</div>

	{#if !query}
		<Alert color="yellow">{m.missingQueryAlert()}</Alert>
		<Button href="/lunar">{m.chooseLocation()}</Button>
	{:else}
		<div class="relative flex w-full flex-col gap-4">
			{#if details}
				<div
					class="grid grid-cols-2 gap-4 *:min-w-0 transition-opacity lg:grid-cols-4"
					class:opacity-40={loading}
					aria-busy={loading}
				>
					{#if details.visible}
						<LunarNowModeCard
							contacts={details.contacts}
							localType={details.localType}
							series={details.series ?? []}
						/>
					{/if}

					<Card class="w-full min-w-0 overflow-hidden p-2 max-w-none" size="xl">
						{@const observerPlace =
							details.location.label ||
							formatCoordinates(details.location.lat, details.location.lon)}
						<p class="mb-2 text-sm font-medium">{m.observerHeading()}</p>
						<dl
							class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm"
						>
							<dt class="text-gray-500 dark:text-gray-400">{m.place()}</dt>
							<dd class="min-w-0 truncate" title={observerPlace}>
								{observerPlace}
							</dd>
							<dt class="text-gray-500 dark:text-gray-400">
								{m.coordinates()}
							</dt>
							<dd class="min-w-0 break-words font-medium tabular-nums">
								{formatCoordinates(
									details.location.lat,
									details.location.lon,
								)}
							</dd>
							<dt class="text-gray-500 dark:text-gray-400">{m.elevation()}</dt>
							<dd class="min-w-0 tabular-nums">
								{formatElevation(
									details.location.height,
									unitsState.distance,
								)}
							</dd>
							<dt class="text-gray-500 dark:text-gray-400">{m.timezone()}</dt>
							<dd class="min-w-0 break-words" title={timeZone}>{timeZone}</dd>
						</dl>
					</Card>

					<Card class="w-full p-2 max-w-none" size="xl">
						<p class="mb-2 text-sm font-medium">{m.lunarDaylightHeading()}</p>
						<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
							<dt class="text-gray-500 dark:text-gray-400">{m.moonrise()}</dt>
							<dd class="tabular-nums">
								{formatInstant(details.moonriseIso)}
							</dd>
							<dt class="text-gray-500 dark:text-gray-400">{m.moonset()}</dt>
							<dd class="tabular-nums">
								{formatInstant(details.moonsetIso)}
							</dd>
							<dt class="text-gray-500 dark:text-gray-400">{m.greatest()}</dt>
							<dd class="tabular-nums">
								{formatContactTime(details.contacts.max)}
							</dd>
						</dl>
						{#if details.contactMoon.length > 0}
							<ul
								class="mt-3 divide-y divide-gray-200 text-sm dark:divide-gray-700"
								aria-label={m.contactMoonAria()}
							>
								{#each details.contactMoon as row (row.key)}
									<li
										class="flex items-baseline justify-between gap-3 py-1 first:pt-0 last:pb-0"
									>
										<span class="text-gray-500 dark:text-gray-400"
											>{formatLunarContactLabel(row.key)}</span
										>
										<span class="shrink-0 font-medium"
											>{formatMoonUp(row.moonUp)}</span
										>
									</li>
								{/each}
							</ul>
						{/if}
					</Card>

					<Card class="w-full p-2 max-w-none" size="xl">
						<p class="mb-2 text-sm font-medium">{m.lunarWhereToLook()}</p>
						<p class="text-base font-medium">
							{formatLookDirection(
								details.lookDirectionCode,
								details.lookAltitudeDeg,
							)}
						</p>
						{#if details.lookAzimuthDeg !== null}
							<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
								{m.lookMoonAzimuthAltitude({
									azimuth: details.lookAzimuthDeg.toFixed(1),
									altitude: (details.lookAltitudeDeg ?? 0).toFixed(1),
								})}
							</p>
						{/if}
					</Card>

					<Card class="w-full p-2 max-w-none col-span-2" size="xl">
						<p class="mb-2 text-sm font-medium">{m.lunarCoverageHeading()}</p>
						{#if details.visible}
							<div
								class="flex flex-col items-center gap-3 sm:flex-row sm:items-start"
							>
								<LunarUmbraDisk
									size="lg"
									umbralMagnitude={details.umbralMagnitude}
									penumbralMagnitude={details.penumbralMagnitude}
									localType={details.localType}
								/>
								<div class="w-full min-w-0 flex-1 space-y-2">
									<div>
										<p class="mb-1 text-sm">{m.umbralMagnitudeLabel()}</p>
										<Progressbar
											progress={Math.min(
												100,
												Math.max(0, details.umbralMagnitude) * 100,
											)}
											labelInside
											size="h-4"
										/>
										<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
											{m.penumbralMagnitudeLabel()}
											{formatMagnitude(details.penumbralMagnitude)}
										</p>
									</div>
									<p class="text-sm">
										{#if details.totalDurationSeconds}
											{m.centralDuration({
												duration: formatDuration(details.totalDurationSeconds),
											})}
											·
										{/if}
										{#if details.umbralDurationSeconds}
											{m.umbralDuration({
												duration: formatDuration(details.umbralDurationSeconds),
											})}
										{:else}
											{m.penumbralDuration({
												duration: formatDuration(details.durationSeconds),
											})}
										{/if}
									</p>
								</div>
							</div>
						{:else}
							<p class="text-sm text-gray-500 dark:text-gray-400">
								{m.lunarNoLocalCoverage()}
							</p>
						{/if}
					</Card>

					<Card class="w-full p-2 max-w-none col-span-2" size="xl">
						<p class="mb-2 text-sm font-medium">{m.globalFacts()}</p>
						{@const g = details.global}
						<dl class="grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
							<div class="grid grid-cols-[auto_1fr] gap-x-4">
								<dt class="text-gray-500 dark:text-gray-400">
									{m.typeHeading()}
								</dt>
								<dd class="font-medium">{formatLunarType(g.type)}</dd>
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
									{m.umbralMagnitudeLabel()}
								</dt>
								<dd class="tabular-nums">
									{formatMagnitude(g.umbralMagnitude)}
								</dd>
							</div>
							<div class="grid grid-cols-[auto_1fr] gap-x-4">
								<dt class="text-gray-500 dark:text-gray-400">
									{m.penumbralMagnitudeLabel()}
								</dt>
								<dd class="tabular-nums">
									{formatMagnitude(g.penumbralMagnitude)}
								</dd>
							</div>
							<div class="grid grid-cols-[auto_1fr] gap-x-4">
								<dt class="text-gray-500 dark:text-gray-400">
									{m.maxDuration()}
								</dt>
								<dd class="tabular-nums">
									{formatDuration(g.penumbralDurationSeconds)}
								</dd>
							</div>
							<div class="grid grid-cols-[auto_1fr] gap-x-4">
								<dt class="text-gray-500 dark:text-gray-400">
									{m.maxCentral()}
								</dt>
								<dd class="tabular-nums">
									{formatDuration(g.totalDurationSeconds)}
								</dd>
							</div>
							<div class="grid grid-cols-[auto_1fr] gap-x-4">
								<dt class="text-gray-500 dark:text-gray-400">
									{m.greatest()}
								</dt>
								<dd class="tabular-nums">
									{formatCoordinates(g.zenithLat, g.zenithLon)}
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
					</Card>

					<LunarCompareLocationsCard date={details.date} primary={details} />

					<LunarStagesCard contacts={details.contacts} />

					<CloudForecastCard
						location={details.location}
						contacts={cloudContacts}
					/>

					<LunarCoverageScrubber
						series={details.series ?? []}
						localType={details.localType}
						contacts={details.contacts}
					/>

					<Card class="w-full p-2 max-w-none col-span-2" size="xl">
						<p class="mb-2 text-sm font-medium">{m.moonAltitude()}</p>
						<p class="mb-3 text-xs text-gray-500 dark:text-gray-400">
							{m.moonAltitudeHint()}
						</p>
						<LunarAltitudeChart
							samples={details.series ?? []}
							contacts={details.contacts}
						/>
					</Card>

					<Card
						class="w-full p-2 max-w-none col-span-2 lg:col-span-4"
						size="xl"
					>
						<p class="mb-2 text-sm font-medium">{m.umbralMagChart()}</p>
						<p class="mb-3 text-xs text-gray-500 dark:text-gray-400">
							{m.umbralMagChartHint()}
						</p>
						<LunarMagnitudeChart
							samples={details.series ?? []}
							contacts={details.contacts}
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
