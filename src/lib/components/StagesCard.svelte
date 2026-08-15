<script lang="ts">
import { Card } from "flowbite-svelte";
import { formatStageLabel } from "$lib/eclipse/detail-format";
import {
	formatContactTime,
	formatCountdown,
	localDateKey,
} from "$lib/eclipse/time";
import { m } from "$lib/paraglide/messages.js";
import type { ContactTimes, LocalEclipseType } from "$lib/types";

let {
	contacts,
	localType,
}: {
	contacts: ContactTimes;
	localType: LocalEclipseType;
} = $props();

let nowMs = $state(Date.now());

const stages = $derived.by(() => {
	const rows: { key: string; label: string; iso: string }[] = [];
	if (contacts.c1) {
		rows.push({
			key: "c1",
			label: formatStageLabel("c1", localType),
			iso: contacts.c1,
		});
	}
	if (contacts.c2) {
		rows.push({
			key: "c2",
			label: formatStageLabel("c2", localType),
			iso: contacts.c2,
		});
	}
	if (contacts.max) {
		rows.push({
			key: "max",
			label: formatStageLabel("max", localType),
			iso: contacts.max,
		});
	}
	if (contacts.c3) {
		rows.push({
			key: "c3",
			label: formatStageLabel("c3", localType),
			iso: contacts.c3,
		});
	}
	if (contacts.c4) {
		rows.push({
			key: "c4",
			label: formatStageLabel("c4", localType),
			iso: contacts.c4,
		});
	}

	const days = new Set(rows.map((row) => localDateKey(row.iso)));
	const includeDate = days.size > 1;

	return rows.map((row) => {
		const targetMs = Date.parse(row.iso);
		let countdown: string = m.emDash();
		if (Number.isFinite(targetMs)) {
			countdown =
				targetMs <= nowMs
					? m.countdownPassed()
					: formatCountdown(targetMs - nowMs);
		}
		return {
			...row,
			time: formatContactTime(row.iso, { includeDate }),
			countdown,
		};
	});
});

$effect(() => {
	nowMs = Date.now();
	const id = setInterval(() => {
		nowMs = Date.now();
	}, 1000);

	return () => clearInterval(id);
});
</script>

<Card class="w-full p-2 max-w-none col-span-2 lg:col-span-4" size="xl">
	<p class="mb-2 text-sm font-medium">{m.stagesHeading()}</p>
	<p class="mb-3 text-xs text-gray-500 dark:text-gray-400">
		{m.stagesHint()}
	</p>
	{#if stages.length === 0}
		<p class="text-sm text-gray-500 dark:text-gray-400">{m.noContacts()}</p>
	{:else}
		<div
			class="grid gap-x-4 gap-y-1 text-sm"
			style:grid-template-columns="minmax(0, 1fr) auto auto"
			aria-label={m.stagesAria()}
			aria-live="polite"
		>
			{#each stages as row (row.key)}
				<span class="text-gray-500 dark:text-gray-400">{row.label}</span>
				<time
					class="shrink-0 font-medium tabular-nums text-gray-900 dark:text-white"
					datetime={row.iso}
				>
					{row.time}
				</time>
				<span class="shrink-0 tabular-nums text-gray-700 dark:text-gray-300">
					{row.countdown}
				</span>
			{/each}
		</div>
	{/if}
</Card>
