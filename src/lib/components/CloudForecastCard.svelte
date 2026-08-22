<script lang="ts">
import { Card, Progressbar, Spinner } from "flowbite-svelte";
import { untrack } from "svelte";
import { formatIsoDate } from "$lib/eclipse/time";
import { m } from "$lib/paraglide/messages.js";
import {
	type CloudContactInput,
	type CloudLayerSample,
	type CloudResult,
	clouds,
} from "$lib/services/clouds";
import { formatTemperature } from "$lib/units";
import { unitsState } from "$lib/units-state.svelte";

type ContactRow = CloudContactInput & { label: string };

let {
	location,
	contacts,
	compact = false,
}: {
	location: { lat: number; lon: number } | null;
	contacts: ContactRow[];
	compact?: boolean;
} = $props();

let result = $state.raw<CloudResult | null>(null);
let loading = $state(false);
let loadToken = 0;

const timedContacts = $derived(
	contacts.filter((row): row is ContactRow & { iso: string } =>
		Boolean(row.iso),
	),
);
const timesKey = $derived(
	timedContacts.map((row) => `${row.key}:${row.iso}`).join("|"),
);

const rows = $derived.by(() => {
	if (result?.status !== "ok") {
		return [];
	}
	const byKey = new Map(result.samples.map((sample) => [sample.key, sample]));
	return timedContacts.map((contact) => ({
		key: contact.key,
		label: contact.label,
		iso: contact.iso,
		sample: byKey.get(contact.key)?.sample ?? null,
	}));
});

const sourceLabel = $derived.by(() => {
	if (result?.status !== "ok") {
		return "";
	}
	return result.source === "archive"
		? m.cloudForecastSourceArchive()
		: m.cloudForecastSourceForecast();
});

$effect(() => {
	location?.lat;
	location?.lon;
	timesKey;
	unitsState.temperature;
	untrack(() => {
		void load();
	});
	return () => {
		loadToken += 1;
	};
});

async function load(): Promise<void> {
	const token = ++loadToken;
	if (!location || timedContacts.length === 0) {
		result = null;
		loading = false;
		return;
	}
	loading = true;
	result = null;
	try {
		const next = await clouds.getAtContacts(
			location.lat,
			location.lon,
			timedContacts,
		);
		if (token !== loadToken) {
			return;
		}
		result = next;
		loading = false;
	} catch {
		if (token !== loadToken) {
			return;
		}
		result = { status: "unavailable" };
		loading = false;
	}
}

function formatCloudPct(value: number | null | undefined): string {
	if (value === null || value === undefined || !Number.isFinite(value)) {
		return m.emDash();
	}
	return m.percent({ value: Math.round(value) });
}

function formatAirTemperature(sample: CloudLayerSample | null): string {
	const celsius = sample?.temperatureCelsius;
	if (celsius === null || celsius === undefined) {
		return m.emDash();
	}
	return formatTemperature(celsius, unitsState.temperature);
}

function cloudBarColor(percent: number): "green" | "yellow" | "red" {
	if (percent < 30) {
		return "green";
	}
	if (percent < 70) {
		return "yellow";
	}
	return "red";
}

function layerLine(sample: CloudLayerSample): string {
	return m.cloudForecastLayers({
		low: formatCloudPct(sample.low),
		mid: formatCloudPct(sample.mid),
		high: formatCloudPct(sample.high),
	});
}
</script>

{#snippet body()}
	{#if loading && !result}
		<div
			class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
		>
			<Spinner size="4" />
			<span>{m.cloudForecastLoading()}</span>
		</div>
	{:else if result?.status === "too-far"}
		<p class="text-sm text-gray-500 dark:text-gray-400">
			{m.cloudForecastTooFar({ date: formatIsoDate(result.availableFromDate) })}
		</p>
	{:else if result?.status === "too-old"}
		<p class="text-sm text-gray-500 dark:text-gray-400">
			{m.cloudForecastTooOld()}
		</p>
	{:else if result?.status === "unavailable"}
		<p class="text-sm text-gray-500 dark:text-gray-400">
			{m.cloudForecastUnavailable()}
		</p>
	{:else if result?.status === "ok"}
		<ul
			class="divide-y divide-gray-200 text-sm dark:divide-gray-700"
			aria-label={m.cloudForecastAria()}
		>
			{#each rows as row (row.key)}
				<li class="py-1.5 first:pt-0 last:pb-0">
					<div class="flex items-baseline justify-between gap-3">
						<span class="text-gray-600 dark:text-gray-400">{row.label}</span>
						<span
							class="flex shrink-0 items-baseline gap-2 font-medium tabular-nums text-gray-900 dark:text-white"
						>
							<span>{formatCloudPct(row.sample?.total)}</span>
							<span class="text-xs font-normal text-gray-500 dark:text-gray-400">
								{formatAirTemperature(row.sample)}
							</span>
						</span>
					</div>
					{#if !compact && row.sample}
						<div class="mt-1">
							<Progressbar
								progress={row.sample.total}
								color={cloudBarColor(row.sample.total)}
								size="h-2"
							/>
							<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
								{layerLine(row.sample)}
							</p>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
		<p class="mt-2 text-xs text-gray-500 dark:text-gray-400">{sourceLabel}</p>
	{/if}
{/snippet}

{#if location && timedContacts.length > 0}
	{#if compact}
		<div class="space-y-2">
			<p class="text-sm font-medium">{m.cloudForecastHeading()}</p>
			{@render body()}
		</div>
	{:else}
		<Card class="w-full p-2 max-w-none col-span-2 lg:col-span-4" size="xl">
			<p class="mb-2 text-sm font-medium">{m.cloudForecastHeading()}</p>
			<p class="mb-3 text-xs text-gray-500 dark:text-gray-400">
				{m.cloudForecastHint()}
			</p>
			{@render body()}
		</Card>
	{/if}
{/if}
