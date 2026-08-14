<script lang="ts">
import { Button, Card } from "flowbite-svelte";
import { formatContactTime, formatPercent } from "$lib/eclipse/time";
import type {
	CircumstanceSample,
	ContactTimes,
	LocalEclipseType,
} from "$lib/types";
import CoverageDisk from "./CoverageDisk.svelte";

let {
	series = [],
	localType = "partial",
	contacts,
}: {
	series?: CircumstanceSample[];
	localType?: LocalEclipseType;
	contacts: ContactTimes;
} = $props();

const maxIndex = $derived(Math.max(0, series.length - 1));

const seriesId = $derived(
	`${series.length}:${series[0]?.iso ?? ""}:${contacts.max ?? ""}`,
);

function indexNearestIso(iso: string | null): number | null {
	if (series.length === 0 || !iso) {
		return null;
	}
	const target = Date.parse(iso);
	if (!Number.isFinite(target)) {
		return null;
	}
	let best = 0;
	let bestDist = Number.POSITIVE_INFINITY;
	for (let i = 0; i < series.length; i++) {
		const dist = Math.abs(Date.parse(series[i].iso) - target);
		if (dist < bestDist) {
			bestDist = dist;
			best = i;
		}
	}
	return best;
}

const defaultIndex = $derived.by(() => {
	const maxIdx = indexNearestIso(contacts.max);
	if (maxIdx !== null) {
		return maxIdx;
	}
	if (series.length === 0) {
		return 0;
	}
	return Math.floor(series.length / 2);
});

/** Scrub position scoped to the current series; cleared when series identity changes. */
let scrubbed = $state<{ seriesId: string; index: number } | null>(null);

const index = $derived(
	scrubbed && scrubbed.seriesId === seriesId ? scrubbed.index : defaultIndex,
);

const sample = $derived(
	series.length === 0 ? null : series[Math.min(index, maxIndex)],
);

const contactButtons = $derived(
	(
		[
			{ key: "c1", label: "C1", iso: contacts.c1 },
			{ key: "c2", label: "C2", iso: contacts.c2 },
			{ key: "max", label: "Max", iso: contacts.max },
			{ key: "c3", label: "C3", iso: contacts.c3 },
			{ key: "c4", label: "C4", iso: contacts.c4 },
		] as const
	).flatMap((btn) => {
		const nearest = indexNearestIso(btn.iso);
		return nearest === null ? [] : [{ key: btn.key, label: btn.label, nearest }];
	}),
);

function setIndex(value: number): void {
	const next = Math.min(maxIndex, Math.max(0, Math.round(Number(value))));
	scrubbed = { seriesId, index: next };
}

function formatHm(iso: string | null): string {
	if (!iso) {
		return "";
	}
	return new Intl.DateTimeFormat(undefined, {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	}).format(new Date(iso));
}
</script>

<Card class="col-span-2 w-full max-w-none p-2 lg:col-span-2" size="xl">
	<p class="mb-2 text-sm font-medium">Coverage over time</p>
	<p class="mb-3 text-xs text-gray-500 dark:text-gray-400">
		Scrub from first to fourth contact
	</p>
	{#if !sample}
		<p class="text-sm text-gray-500 dark:text-gray-400">
			No coverage series for this location.
		</p>
	{:else}
		<div class="flex flex-col items-center gap-3">
			<CoverageDisk
				size="lg"
				obscuration={sample.obscuration}
				magnitude={sample.magnitude}
				moonSunRatio={sample.moonSunRatio}
				localType={sample.localType ?? localType}
				positionAngleDeg={sample.moonPaDeg}
			/>
			<div class="w-full min-w-0 space-y-2">
				<p class="text-sm tabular-nums text-gray-700 dark:text-gray-300">
					{formatContactTime(sample.iso)}
				</p>
				<p class="text-sm">
					Coverage {formatPercent(sample.obscuration)} · Magnitude
					{formatPercent(sample.magnitude)}
				</p>
				<label class="block">
					<span class="sr-only">Eclipse time</span>
					<input
						type="range"
						class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700"
						min="0"
						max={maxIndex}
						step="1"
						value={index}
						oninput={(e) => setIndex(Number(e.currentTarget.value))}
						disabled={series.length < 2}
					>
				</label>
				{#if contactButtons.length > 0}
					<div class="flex flex-wrap gap-1.5">
						{#each contactButtons as btn (btn.key)}
							<Button
								size="xs"
								color={index === btn.nearest ? "primary" : "alternative"}
								onclick={() => setIndex(btn.nearest)}
							>
								{btn.label}
							</Button>
						{/each}
					</div>
				{/if}
				<div
					class="flex justify-between text-[10px] text-gray-500 dark:text-gray-400"
				>
					<span>{formatHm(series[0]?.iso ?? null)}</span>
					<span>{formatHm(series.at(-1)?.iso ?? null)}</span>
				</div>
			</div>
		</div>
	{/if}
</Card>
