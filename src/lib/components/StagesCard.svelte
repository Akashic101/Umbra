<script lang="ts">
import { Card } from "flowbite-svelte";
import {
	formatContactTime,
	formatCountdown,
	localDateKey,
} from "$lib/eclipse/time";
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
	const c2Label =
		localType === "total"
			? "Totality begins"
			: localType === "annular"
				? "Annularity begins"
				: "Second contact";
	const c3Label =
		localType === "total"
			? "Totality ends"
			: localType === "annular"
				? "Annularity ends"
				: "Third contact";

	const rows: { key: string; label: string; iso: string }[] = [];
	if (contacts.c1) {
		rows.push({ key: "c1", label: "C1 — First contact", iso: contacts.c1 });
	}
	if (contacts.c2) {
		rows.push({ key: "c2", label: `C2 — ${c2Label}`, iso: contacts.c2 });
	}
	if (contacts.max) {
		rows.push({
			key: "max",
			label: "Greatest — Greatest eclipse",
			iso: contacts.max,
		});
	}
	if (contacts.c3) {
		rows.push({ key: "c3", label: `C3 — ${c3Label}`, iso: contacts.c3 });
	}
	if (contacts.c4) {
		rows.push({ key: "c4", label: "C4 — Fourth contact", iso: contacts.c4 });
	}

	const days = new Set(rows.map((row) => localDateKey(row.iso)));
	const includeDate = days.size > 1;

	return rows.map((row) => {
		const targetMs = Date.parse(row.iso);
		let countdown = "—";
		if (Number.isFinite(targetMs)) {
			countdown =
				targetMs <= nowMs ? "passed" : formatCountdown(targetMs - nowMs);
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

<Card class="w-full max-w-none col-span-2 lg:col-span-4" size="xl">
	<p class="mb-2 text-sm font-medium">Stages</p>
	<p class="mb-3 text-xs text-gray-500 dark:text-gray-400">
		Local contact times down to the second
	</p>
	{#if stages.length === 0}
		<p class="text-sm text-gray-500 dark:text-gray-400">No contacts available.</p>
	{:else}
		<div
			class="grid gap-x-4 gap-y-1 text-sm"
			style:grid-template-columns="minmax(0, 1fr) auto auto"
			aria-label="Eclipse stages"
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
