<script lang="ts">
import { Button, Card } from "flowbite-svelte";
import { getLunarNowState, seriesIndexAtMs } from "$lib/eclipse/now-mode";
import { formatContactTime, formatMagnitude } from "$lib/eclipse/time";
import { m } from "$lib/paraglide/messages.js";
import type {
	LunarCircumstanceSample,
	LunarContactTimes,
	LunarLocalType,
} from "$lib/types";
import LunarUmbraDisk from "./LunarUmbraDisk.svelte";

let {
	series = [],
	localType = "partial",
	contacts,
}: {
	series?: LunarCircumstanceSample[];
	localType?: LunarLocalType;
	contacts: LunarContactTimes;
} = $props();

let nowMs = $state(Date.now());
let followLive = $state(true);

const maxIndex = $derived(Math.max(0, series.length - 1));

const seriesId = $derived(
	`${series.length}:${series[0]?.iso ?? ""}:${contacts.max ?? ""}`,
);

const liveState = $derived(getLunarNowState(contacts, nowMs));
const liveIndex = $derived(
	liveState?.isLive ? seriesIndexAtMs(series, nowMs) : null,
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

let scrubbed = $state<{ seriesId: string; index: number } | null>(null);

const index = $derived.by(() => {
	if (liveState?.isLive && followLive && liveIndex !== null) {
		return Math.min(maxIndex, Math.max(0, liveIndex));
	}
	return scrubbed && scrubbed.seriesId === seriesId
		? scrubbed.index
		: defaultIndex;
});

const sample = $derived(
	series.length === 0 ? null : series[Math.min(index, maxIndex)],
);

const contactButtons = $derived(
	(
		[
			{ key: "p1", label: "P1", iso: contacts.p1 },
			{ key: "u1", label: "U1", iso: contacts.u1 },
			{ key: "u2", label: "U2", iso: contacts.u2 },
			{ key: "max", label: m.scrubMax(), iso: contacts.max },
			{ key: "u3", label: "U3", iso: contacts.u3 },
			{ key: "u4", label: "U4", iso: contacts.u4 },
			{ key: "p4", label: "P4", iso: contacts.p4 },
		] as const
	).flatMap((btn) => {
		const nearest = indexNearestIso(btn.iso);
		return nearest === null
			? []
			: [{ key: btn.key, label: btn.label, nearest }];
	}),
);

function setIndex(value: number): void {
	const next = Math.min(maxIndex, Math.max(0, Math.round(Number(value))));
	followLive = false;
	scrubbed = { seriesId, index: next };
}

function resumeLive(): void {
	followLive = true;
	scrubbed = null;
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

$effect(() => {
	nowMs = Date.now();
	const id = setInterval(() => {
		nowMs = Date.now();
	}, 1000);

	return () => clearInterval(id);
});
</script>

<Card class="col-span-2 w-full max-w-none p-2 lg:col-span-2" size="xl">
	<p class="mb-2 text-sm font-medium">{m.lunarCoverageOverTime()}</p>
	<p class="mb-3 text-xs text-gray-500 dark:text-gray-400">
		{m.lunarCoverageOverTimeHint()}
	</p>
	{#if !sample}
		<p class="text-sm text-gray-500 dark:text-gray-400">
			{m.noCoverageSeries()}
		</p>
	{:else}
		<div class="flex flex-col items-center gap-3">
			<LunarUmbraDisk
				size="lg"
				umbralMagnitude={sample.umbralMagnitude}
				penumbralMagnitude={sample.penumbralMagnitude}
				localType={sample.localType ?? localType}
			/>
			<div class="w-full min-w-0 space-y-2">
				<p class="text-sm tabular-nums text-gray-700 dark:text-gray-300">
					{formatContactTime(sample.iso)}
				</p>
				<p class="text-sm">
					{m.umbralMagnitudeLabel()}
					{formatMagnitude(sample.umbralMagnitude)}
					·
					{m.penumbralMagnitudeLabel()}
					{formatMagnitude(sample.penumbralMagnitude)}
				</p>
				<label class="block">
					<span class="sr-only">{m.eclipseTimeAria()}</span>
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
				{#if contactButtons.length > 0 || liveState?.isLive}
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
						{#if liveState?.isLive}
							{#if followLive}
								<Button size="xs" color="alternative" disabled>
									{m.nowFollowingLive()}
								</Button>
							{:else}
								<Button size="xs" color="primary" onclick={resumeLive}>
									{m.nowFollowLive()}
								</Button>
							{/if}
						{/if}
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
