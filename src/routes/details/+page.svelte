<script lang="ts">
import { Alert, Button, Card, Spinner } from "flowbite-svelte";
import { page } from "$app/state";
import AltitudeChart from "$lib/components/AltitudeChart.svelte";
import StagesCard from "$lib/components/StagesCard.svelte";
import { deviceTimeZone, parseDetailsQuery } from "$lib/details-query";
import {
	formatPathStatus,
	formatPathWidthKm,
} from "$lib/eclipse/detail-format";
import { formatContactTime, formatInstant } from "$lib/eclipse/time";
import { eclipseService } from "$lib/services/eclipse";
import { formatCoordinates } from "$lib/services/geocoding";
import type { ObserverEclipseDetails } from "$lib/types";
import { untrack } from "svelte";

let details = $state.raw<ObserverEclipseDetails | null>(null);
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
		error = null;
		loading = false;
		return;
	}
	loading = true;
	error = null;
	try {
		const next = await eclipseService.getObserverDetails(
			parsed.date,
			parsed.location,
		);
		if (token !== loadToken) {
			return;
		}
		details = next;
		error = null;
	} catch (err) {
		if (token !== loadToken) {
			return;
		}
		error =
			err instanceof Error ? err.message : "Failed to load eclipse details.";
		details = null;
	} finally {
		if (token === loadToken) {
			loading = false;
		}
	}
}
</script>

<div
	class="mx-auto flex h-full w-full flex-col gap-4 overflow-y-auto px-4 pb-10 pt-4 sm:px-6"
>
	<div class="flex w-full items-center justify-between gap-3">
		<div>
			<p class="text-xs text-gray-500 dark:text-gray-400">Eclipse details</p>
			<h1 class="text-xl font-semibold">
				{query?.date ?? "Missing selection"}
			</h1>
		</div>
		<Button color="alternative" size="sm" href="/">Back to map</Button>
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
					<Card class="w-full max-w-none" size="xl">
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

					<Card class="w-full max-w-none" size="xl">
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
					</Card>

					<Card class="w-full max-w-none" size="xl">
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

					<Card class="w-full max-w-none" size="xl">
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

					<StagesCard
						contacts={details.contacts}
						localType={details.localType}
					/>

					<Card
						class="w-full max-w-none col-span-2 lg:col-span-4"
						size="xl"
					>
						<p class="mb-2 text-sm font-medium">Sun altitude</p>
						<p class="mb-3 text-xs text-gray-500 dark:text-gray-400">
							Apparent altitude from first to fourth contact
						</p>
						<AltitudeChart
							samples={details.altitudeSeries}
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
