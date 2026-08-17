<script lang="ts">
import {
	Badge,
	Listgroup,
	ListgroupItem,
	PaginationNav,
	Spinner,
} from "flowbite-svelte";
import { appState } from "$lib/app-state.svelte";
import { formatLunarType } from "$lib/eclipse/detail-format";
import {
	formatDuration,
	formatIsoDate,
	formatMagnitude,
} from "$lib/eclipse/time";
import { lunarState } from "$lib/lunar-state.svelte";
import { m } from "$lib/paraglide/messages.js";

const PAGE_SIZE = 10;

const typeColor: Record<string, "red" | "yellow" | "purple" | "blue" | "gray"> =
	{
		total: "red",
		partial: "blue",
		penumbral: "purple",
		none: "gray",
	};

let page = $state(1);

const totalCount = $derived(lunarState.filteredCatalog.length);
const totalPages = $derived(Math.max(1, Math.ceil(totalCount / PAGE_SIZE)));
const currentPage = $derived(Math.min(page, totalPages));
const pageItems = $derived(
	lunarState.filteredCatalog.slice(
		(currentPage - 1) * PAGE_SIZE,
		currentPage * PAGE_SIZE,
	),
);

function onPageChange(next: number) {
	page = Math.min(Math.max(1, next), totalPages);
}

function durationForRow(
	entry: (typeof pageItems)[number],
	local: (typeof lunarState.localByDate)[string] | undefined,
): number {
	if (local?.visible) {
		return local.durationSeconds;
	}
	if (entry.totalDurationSeconds > 0) {
		return entry.totalDurationSeconds;
	}
	if (entry.umbralDurationSeconds > 0) {
		return entry.umbralDurationSeconds;
	}
	return entry.penumbralDurationSeconds;
}
</script>

<div class="flex flex-col">
	<div class="mb-2 flex items-center justify-between gap-2">
		<p class="text-sm font-medium">
			{m.eclipseCountPage({
				count: totalCount,
				page: currentPage,
				totalPages,
			})}
		</p>
		{#if lunarState.loadingLocal || lunarState.loadingCatalog}
			<Spinner size="4" />
		{/if}
	</div>
	<Listgroup>
		{#each pageItems as entry (entry.date)}
			{@const local = lunarState.localByDate[entry.date]}
			<ListgroupItem
				active
				current={lunarState.selectedDate === entry.date}
				onclick={() => lunarState.selectEclipse(entry.date)}
			>
				{@const displayType = local?.visible ? local.localType : entry.type}
				<div class="flex w-full items-start justify-between gap-2">
					<div>
						<p class="font-medium">{formatIsoDate(entry.date)}</p>
						<p class="text-xs text-gray-500 dark:text-gray-400">
							{#if local && !local.visible && appState.location}
								{m.moonBelowHorizon()}
								·
								{m.listUmbralMagDuration({
									magnitude: formatMagnitude(entry.umbralMagnitude),
									duration: formatDuration(durationForRow(entry, local)),
								})}
							{:else}
								{m.listUmbralMagDuration({
									magnitude: formatMagnitude(entry.umbralMagnitude),
									duration: formatDuration(durationForRow(entry, local)),
								})}
							{/if}
						</p>
					</div>
					<Badge color={typeColor[displayType] ?? "blue"}>
						{formatLunarType(displayType === "none" ? entry.type : displayType)}
					</Badge>
				</div>
			</ListgroupItem>
		{/each}
	</Listgroup>
	{#if totalCount > 0}
		<div class="mt-2 flex items-center justify-between gap-2">
			<p class="shrink-0 text-xs text-gray-500 dark:text-gray-400">
				{m.pageOf({ page: currentPage, totalPages })}
			</p>
			<PaginationNav
				{currentPage}
				{totalPages}
				layout="navigation"
				previousLabel={m.paginationPrev()}
				nextLabel={m.paginationNext()}
				class="shrink-0"
				{onPageChange}
			/>
		</div>
	{/if}
</div>
