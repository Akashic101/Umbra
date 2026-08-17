<script lang="ts">
import { Alert, Button, Card, Progressbar, Spinner } from "flowbite-svelte";
import { appState } from "$lib/app-state.svelte";
import { serializeDetailsQuery } from "$lib/details-query";
import {
	formatLunarContactLabel,
	formatLunarLocalTypeTitle,
} from "$lib/eclipse/detail-format";
import { getLunarNowState } from "$lib/eclipse/now-mode";
import {
	formatContactTime,
	formatCountdown,
	formatDuration,
	formatMagnitude,
	localDateKey,
} from "$lib/eclipse/time";
import { lunarState } from "$lib/lunar-state.svelte";
import { m } from "$lib/paraglide/messages.js";
import { localizeHref } from "$lib/paraglide/runtime";
import type { LunarContactKey } from "$lib/types";
import LunarUmbraDisk from "./LunarUmbraDisk.svelte";

let nowMs = $state(Date.now());

const contacts = $derived(lunarState.circumstances?.contacts);
const showOverlay = $derived(
	lunarState.loadingDetail || lunarState.loadingLocal,
);

const liveState = $derived(contacts ? getLunarNowState(contacts, nowMs) : null);

const detailsHref = $derived.by(() => {
	if (!lunarState.selectedDate || !appState.location) {
		return null;
	}
	const query = serializeDetailsQuery({
		date: lunarState.selectedDate,
		location: {
			lat: appState.location.lat,
			lon: appState.location.lon,
			height: appState.location.height,
			label: appState.location.label,
		},
	});
	return localizeHref(`/lunar/details?${query}`);
});

const contactOrder: LunarContactKey[] = [
	"p1",
	"u1",
	"u2",
	"max",
	"u3",
	"u4",
	"p4",
];

const contactRows = $derived.by(() => {
	const c = contacts;
	if (!c) {
		return [];
	}
	const rows = contactOrder
		.map((key) => ({ key, label: formatLunarContactLabel(key), iso: c[key] }))
		.filter((row) => row.iso);
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

$effect(() => {
	nowMs = Date.now();
	const id = setInterval(() => {
		nowMs = Date.now();
	}, 1000);

	return () => clearInterval(id);
});
</script>

<Card class="relative w-full p-2 max-w-none overflow-hidden" size="xl">
	{#if !lunarState.selectedDate}
		<p class="text-sm text-gray-500 dark:text-gray-400">
			{m.lunarSelectHint()}
		</p>
	{:else if lunarState.circumstances?.visible}
		<div
			class="flex flex-col gap-4 transition-opacity"
			class:opacity-40={showOverlay}
			aria-busy={showOverlay}
		>
			{#if liveState?.isLive}
				<Alert color="green" class="py-2 text-sm" aria-live="polite">
					<p class="font-medium">{m.nowHomeLive()}</p>
					{#if liveState.remainingToMaxMs != null}
						<p class="mt-0.5 tabular-nums">
							{m.nowHomeUntilMax({
								countdown: formatCountdown(liveState.remainingToMaxMs),
							})}
						</p>
					{/if}
					{#if detailsHref}
						<a
							href={detailsHref}
							class="mt-1 inline-block font-medium underline underline-offset-2"
						>
							{m.moreInfo()}
						</a>
					{/if}
				</Alert>
			{/if}
			<p class="font-medium">
				{formatLunarLocalTypeTitle(lunarState.circumstances.localType)}
			</p>
			<LunarUmbraDisk
				umbralMagnitude={lunarState.circumstances.umbralMagnitude}
				penumbralMagnitude={lunarState.circumstances.penumbralMagnitude}
				localType={lunarState.circumstances.localType}
			/>
			<div>
				<p class="mb-1 text-sm">{m.umbralMagnitudeLabel()}</p>
				<Progressbar
					progress={Math.min(100, Math.max(0, lunarState.circumstances.umbralMagnitude) * 100)}
					labelInside
					size="h-4"
				/>
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
					{m.penumbralMagnitudeLabel()}
					{formatMagnitude(lunarState.circumstances.penumbralMagnitude)}
				</p>
			</div>
			<ul
				class="divide-y divide-gray-200 text-sm dark:divide-gray-700"
				aria-label={m.contactsAria()}
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
				{#if lunarState.circumstances.totalDurationSeconds}
					{m.centralDuration({
						duration: formatDuration(lunarState.circumstances.totalDurationSeconds),
					})}
					·
				{/if}
				{#if lunarState.circumstances.umbralDurationSeconds}
					{m.umbralDuration({
						duration: formatDuration(lunarState.circumstances.umbralDurationSeconds),
					})}
				{:else}
					{m.penumbralDuration({
						duration: formatDuration(lunarState.circumstances.durationSeconds),
					})}
				{/if}
			</p>
			{#if detailsHref}
				<Button href={detailsHref} color="primary" class="w-full">
					{m.moreInfo()}
				</Button>
			{/if}
		</div>
	{:else if lunarState.circumstances}
		<div class:opacity-40={showOverlay} aria-busy={showOverlay}>
			<Alert color="blue">{m.lunarNotVisibleAlert()}</Alert>
			{#if detailsHref}
				<div class="mt-3">
					<Button href={detailsHref} color="alternative" class="w-full">
						{m.moreInfo()}
					</Button>
				</div>
			{/if}
		</div>
	{:else if !appState.location}
		<Alert color="yellow">{m.pickLocationAlert()}</Alert>
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
			<span class="sr-only">{m.updatingDetailsAria()}</span>
		</div>
	{/if}
</Card>
