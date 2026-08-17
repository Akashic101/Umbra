<script lang="ts">
import { Badge, Card, Progressbar } from "flowbite-svelte";
import {
	formatLunarContactLabel,
	formatLunarNowPhase,
} from "$lib/eclipse/detail-format";
import { getLunarNowState, seriesIndexAtMs } from "$lib/eclipse/now-mode";
import { formatContactTime, formatCountdown } from "$lib/eclipse/time";
import { m } from "$lib/paraglide/messages.js";
import type {
	LunarCircumstanceSample,
	LunarContactTimes,
	LunarLocalType,
} from "$lib/types";
import LunarUmbraDisk from "./LunarUmbraDisk.svelte";

let {
	contacts,
	localType,
	series = [],
}: {
	contacts: LunarContactTimes;
	localType: LunarLocalType;
	series?: LunarCircumstanceSample[];
} = $props();

let nowMs: number = $state(Date.now());

const nowState = $derived(getLunarNowState(contacts, nowMs));

const clockIso = $derived(new Date(nowMs).toISOString());
const clockLabel = $derived(formatContactTime(clockIso));

const badge = $derived.by(() => {
	if (!nowState) {
		return null;
	}
	if (nowState.isLive) {
		return { label: m.nowLiveBadge(), color: "green" as const };
	}
	if (nowState.phase === "ended") {
		return { label: m.nowEndedBadge(), color: "gray" as const };
	}
	return { label: m.nowUpcomingBadge(), color: "blue" as const };
});

const hint = $derived.by(() => {
	if (!nowState) {
		return "";
	}
	if (nowState.isLive) {
		return m.nowHintLive();
	}
	if (nowState.phase === "ended") {
		return m.nowHintEnded();
	}
	return m.nowHintUpcoming();
});

const diskSample = $derived.by(() => {
	if (!nowState || series.length === 0) {
		return null;
	}
	if (nowState.isLive) {
		return series[seriesIndexAtMs(series, nowMs)] ?? null;
	}
	if (nowState.phase === "upcoming" && nowState.maxMs !== null) {
		return series[seriesIndexAtMs(series, nowState.maxMs)] ?? null;
	}
	return null;
});

const progress = $derived(
	nowState?.progress01 != null ? Math.round(nowState.progress01 * 100) : 0,
);

$effect(() => {
	nowMs = Date.now();
	const id = setInterval(() => {
		nowMs = Date.now();
	}, 1000);

	return () => clearInterval(id);
});
</script>

{#if nowState && badge}
	<Card class="w-full p-2 max-w-none col-span-2 lg:col-span-4" size="xl">
		<div class="mb-2 flex flex-wrap items-center gap-2">
			<p class="text-sm font-medium">{m.nowHeading()}</p>
			<Badge color={badge.color}>{badge.label}</Badge>
		</div>
		<p class="mb-3 text-xs text-gray-500 dark:text-gray-400">{hint}</p>

		<div
			class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
		>
			<div class="min-w-0 flex-1 space-y-3">
				<p
					class="text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl"
				>
					{formatLunarNowPhase(nowState.phase, localType)}
				</p>
				<time
					class="block text-sm tabular-nums text-gray-700 dark:text-gray-300"
					datetime={clockIso}
				>
					<span class="sr-only">{m.nowClockAria()}</span>
					{clockLabel}
				</time>

				{#if nowState.isLive && nowState.progress01 != null}
					<fieldset class="min-w-0 border-0 p-0">
						<legend class="sr-only">{m.nowProgressAria()}</legend>
						<Progressbar {progress} size="h-3" />
					</fieldset>
				{/if}

				<div class="grid gap-3 sm:grid-cols-2" aria-live="polite">
					{#if nowState.remainingToMaxMs != null}
						<div>
							<p class="text-xs text-gray-500 dark:text-gray-400">
								{m.nowUntilMax()}
							</p>
							<p
								class="text-2xl font-semibold tabular-nums text-gray-900 dark:text-white sm:text-3xl"
							>
								{formatCountdown(nowState.remainingToMaxMs)}
							</p>
						</div>
					{/if}
					{#if nowState.remainingOfCentralMs != null}
						<div>
							<p class="text-xs text-gray-500 dark:text-gray-400">
								{m.nowCentralRemaining({
									centralWord: m.centralWordTotality(),
								})}
							</p>
							<p
								class="text-2xl font-semibold tabular-nums text-gray-900 dark:text-white sm:text-3xl"
							>
								{formatCountdown(nowState.remainingOfCentralMs)}
							</p>
						</div>
					{:else if nowState.remainingToNextMs != null && nowState.nextKey}
						<div>
							<p class="text-xs text-gray-500 dark:text-gray-400">
								{m.nowUntilNext({
									label: formatLunarContactLabel(nowState.nextKey),
								})}
							</p>
							<p
								class="text-2xl font-semibold tabular-nums text-gray-900 dark:text-white sm:text-3xl"
							>
								{formatCountdown(nowState.remainingToNextMs)}
							</p>
						</div>
					{/if}
				</div>
			</div>

			{#if diskSample}
				<div class="mx-auto shrink-0 sm:mx-0">
					<LunarUmbraDisk
						size="md"
						umbralMagnitude={diskSample.umbralMagnitude}
						penumbralMagnitude={diskSample.penumbralMagnitude}
						localType={diskSample.localType ?? localType}
					/>
				</div>
			{/if}
		</div>
	</Card>
{/if}
