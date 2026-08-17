<script lang="ts">
import { Card } from "flowbite-svelte";
import { formatLunarStageLabel } from "$lib/eclipse/detail-format";
import {
	formatContactTime,
	formatCountdown,
	localDateKey,
} from "$lib/eclipse/time";
import { m } from "$lib/paraglide/messages.js";
import type { LunarContactKey, LunarContactTimes } from "$lib/types";

let {
	contacts,
}: {
	contacts: LunarContactTimes;
} = $props();

let nowMs = $state(Date.now());

const order: LunarContactKey[] = ["p1", "u1", "u2", "max", "u3", "u4", "p4"];

const stages = $derived.by(() => {
	const rows: { key: LunarContactKey; label: string; iso: string }[] = [];
	for (const key of order) {
		const iso = contacts[key];
		if (iso) {
			rows.push({ key, label: formatLunarStageLabel(key), iso });
		}
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
		<table
			class="w-full text-sm"
			aria-label={m.stagesAria()}
			aria-live="polite"
		>
			<tbody>
				{#each stages as row (row.key)}
					<tr>
						<td class="py-0.5 text-gray-500 dark:text-gray-400">{row.label}</td>
						<td class="py-0.5 text-right">
							<time
								class="shrink-0 font-medium tabular-nums text-gray-900 dark:text-white"
								datetime={row.iso}
							>
								{row.time}
							</time>
						</td>
						<td
							class="py-0.5 pl-4 text-right tabular-nums text-gray-700 dark:text-gray-300"
						>
							{row.countdown}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</Card>
