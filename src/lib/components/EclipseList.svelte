<script lang="ts">
import {
	Badge,
	Listgroup,
	ListgroupItem,
	PaginationNav,
	Spinner,
} from "flowbite-svelte";
import { appState } from "$lib/app-state.svelte";
import { formatEclipseType } from "$lib/eclipse/detail-format";
import { formatDuration, formatPercent } from "$lib/eclipse/time";
import { m } from "$lib/paraglide/messages.js";

const PAGE_SIZE = 10;

const typeColor: Record<string, "red" | "yellow" | "purple" | "blue" | "gray"> =
	{
		total: "red",
		annular: "yellow",
		hybrid: "purple",
		partial: "blue",
		none: "gray",
	};

let page = $state(1);

const totalCount = $derived(appState.filteredCatalog.length);
const totalPages = $derived(Math.max(1, Math.ceil(totalCount / PAGE_SIZE)));
const currentPage = $derived(Math.min(page, totalPages));
const pageItems = $derived(
	appState.filteredCatalog.slice(
		(currentPage - 1) * PAGE_SIZE,
		currentPage * PAGE_SIZE,
	),
);

function onPageChange(next: number) {
	page = Math.min(Math.max(1, next), totalPages);
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
		{#if appState.loadingLocal || appState.loadingCatalog}
			<Spinner size="4" />
		{/if}
	</div>
	<Listgroup>
		{#each pageItems as entry (entry.date)}
			{@const local = appState.localByDate[entry.date]}
			<ListgroupItem
				active
				current={appState.selectedDate === entry.date}
				onclick={() => appState.selectEclipse(entry.date)}
			>
				{@const displayType = local?.visible ? local.localType : entry.type}
				<div class="flex w-full items-start justify-between gap-2">
					<div>
						<p class="font-medium">{entry.date}</p>
						<p class="text-xs text-gray-500 dark:text-gray-400">
							{#if local?.visible}
								{#if local.localType === entry.type}
									{m.listCoverageDuration({
										coverage: formatPercent(local.obscuration),
										duration: formatDuration(local.durationSeconds),
									})}
								{:else}
									{m.listCoverageDurationGlobal({
										coverage: formatPercent(local.obscuration),
										duration: formatDuration(local.durationSeconds),
										type: formatEclipseType(entry.type),
									})}
								{/if}
							{:else if appState.location}
								{m.listNotVisible({ type: formatEclipseType(entry.type) })}
							{:else}
								{m.listMaxDuration({
									duration: formatDuration(entry.maxDurationSeconds),
								})}
							{/if}
						</p>
					</div>
					<Badge color={typeColor[displayType] ?? "blue"}>
						{formatEclipseType(displayType)}
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
