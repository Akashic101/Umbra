<script lang="ts">
import {
	Accordion,
	AccordionItem,
	Button,
	Checkbox,
	Toggle,
} from "flowbite-svelte";
import { appState } from "$lib/app-state.svelte";
import { m } from "$lib/paraglide/messages.js";
import {
	ALL_ECLIPSE_TYPES,
	CATALOG_YEAR_MAX,
	CATALOG_YEAR_MIN,
	type EclipseType,
	localIsoDate,
} from "$lib/types";

const labels: Record<EclipseType, string> = {
	total: m.typeTotal(),
	annular: m.typeAnnular(),
	hybrid: m.typeHybrid(),
	partial: m.typePartial(),
};

const today = localIsoDate();
const yesterdayDate = new Date();
yesterdayDate.setDate(yesterdayDate.getDate() - 1);
const yesterday = localIsoDate(yesterdayDate);
const currentYear = Number(today.slice(0, 4));

type YearChip = {
	id: string;
	label: string;
	from: number;
	to: number;
	dateFrom: string | null;
	dateTo: string | null;
};

const yearChips: YearChip[] = [
	{
		id: "all",
		label: m.yearsAll(),
		from: CATALOG_YEAR_MIN,
		to: CATALOG_YEAR_MAX,
		dateFrom: null,
		dateTo: null,
	},
	{
		id: "upcoming",
		label: m.yearsUpcoming(),
		from: Math.min(Math.max(currentYear, CATALOG_YEAR_MIN), CATALOG_YEAR_MAX),
		to: CATALOG_YEAR_MAX,
		dateFrom: today,
		dateTo: null,
	},
	{
		id: "past",
		label: m.yearsPast(),
		from: CATALOG_YEAR_MIN,
		to: Math.min(Math.max(currentYear, CATALOG_YEAR_MIN), CATALOG_YEAR_MAX),
		dateFrom: null,
		dateTo: yesterday,
	},
	{
		id: "1900s",
		label: m.years1900to1950(),
		from: 1900,
		to: 1950,
		dateFrom: null,
		dateTo: null,
	},
	{
		id: "1950s",
		label: m.years1950to2000(),
		from: 1950,
		to: 2000,
		dateFrom: null,
		dateTo: null,
	},
	{
		id: "2000s",
		label: m.years2000to2100(),
		from: 2000,
		to: 2100,
		dateFrom: null,
		dateTo: null,
	},
];

const totalDurationChips: { label: string; seconds: number }[] = [
	{ label: m.chipAny(), seconds: 0 },
	{ label: m.chipGte1Min(), seconds: 60 },
	{ label: m.chipGte5Min(), seconds: 5 * 60 },
	{ label: m.chipGte30Min(), seconds: 30 * 60 },
	{ label: m.chipGte1H(), seconds: 60 * 60 },
	{ label: m.chipGte2H(), seconds: 2 * 60 * 60 },
];

const centralDurationChips: { label: string; seconds: number }[] = [
	{ label: m.chipAny(), seconds: 0 },
	{ label: m.chipGte10S(), seconds: 10 },
	{ label: m.chipGte30S(), seconds: 30 },
	{ label: m.chipGte1Min(), seconds: 60 },
	{ label: m.chipGte2Min(), seconds: 2 * 60 },
	{ label: m.chipGte5Min(), seconds: 5 * 60 },
];

const coverageChips: { label: string; obscuration: number }[] = [
	{ label: m.chipAny(), obscuration: 0 },
	{ label: m.chipGte10Pct(), obscuration: 0.1 },
	{ label: m.chipGte25Pct(), obscuration: 0.25 },
	{ label: m.chipGte50Pct(), obscuration: 0.5 },
	{ label: m.chipGte75Pct(), obscuration: 0.75 },
	{ label: m.chipGte90Pct(), obscuration: 0.9 },
];

function isYearChipActive(chip: YearChip): boolean {
	return (
		appState.filters.yearFrom === chip.from &&
		appState.filters.yearTo === chip.to &&
		appState.filters.dateFrom === chip.dateFrom &&
		appState.filters.dateTo === chip.dateTo
	);
}

function selectYears(chip: YearChip): void {
	appState.setFilters({
		yearFrom: chip.from,
		yearTo: chip.to,
		dateFrom: chip.dateFrom,
		dateTo: chip.dateTo,
	});
}

function selectMinDuration(seconds: number): void {
	appState.setFilters({ minDurationSeconds: seconds });
}

function selectMinCentral(seconds: number): void {
	appState.setFilters({ minCentralDurationSeconds: seconds });
}

function selectMinCoverage(obscuration: number): void {
	appState.setFilters({ minObscuration: obscuration });
}
</script>

<Accordion flush>
	<AccordionItem open>
		{#snippet header()}
			{m.filtersHeading()}
		{/snippet}
		<div class="flex flex-col gap-4">
			<div>
				<p class="mb-2 text-sm font-medium">{m.typeHeading()}</p>
				<p class="mb-2 text-xs text-gray-500 dark:text-gray-400">
					{m.typeHint()}
				</p>
				<ul class="flex flex-col gap-2">
					{#each ALL_ECLIPSE_TYPES as type (type)}
						<li>
							<Checkbox
								color="primary"
								checked={appState.filters.types.includes(type)}
								onchange={() => appState.toggleType(type)}
							>
								{labels[type]}
							</Checkbox>
						</li>
					{/each}
				</ul>
			</div>
			<Toggle
				bind:checked={
					() => appState.filters.visibleHere,
					(value) => appState.setFilters({ visibleHere: value })
				}
			>
				{m.visibleHere()}
			</Toggle>
			<div>
				<p class="mb-2 text-sm font-medium">{m.yearsHeading()}</p>
				<div class="flex flex-wrap gap-2">
					{#each yearChips as chip (chip.id)}
						{@const active = isYearChipActive(chip)}
						<Button
							size="xs"
							color={active ? "primary" : "alternative"}
							outline={!active}
							onclick={() => selectYears(chip)}
						>
							{chip.label}
						</Button>
					{/each}
				</div>
			</div>
			<div>
				<p class="mb-2 text-sm font-medium">{m.minTotalLength()}</p>
				<div class="flex flex-wrap gap-2">
					{#each totalDurationChips as chip (chip.seconds)}
						{@const active =
							appState.filters.minDurationSeconds === chip.seconds}
						<Button
							size="xs"
							color={active ? "primary" : "alternative"}
							outline={!active}
							onclick={() => selectMinDuration(chip.seconds)}
						>
							{chip.label}
						</Button>
					{/each}
				</div>
			</div>
			<div>
				<p class="mb-2 text-sm font-medium">{m.minCentralLength()}</p>
				<div class="flex flex-wrap gap-2">
					{#each centralDurationChips as chip (chip.seconds)}
						{@const active =
							appState.filters.minCentralDurationSeconds === chip.seconds}
						<Button
							size="xs"
							color={active ? "primary" : "alternative"}
							outline={!active}
							onclick={() => selectMinCentral(chip.seconds)}
						>
							{chip.label}
						</Button>
					{/each}
				</div>
			</div>
			<div>
				<p class="mb-2 text-sm font-medium">{m.minCoverage()}</p>
				<p class="mb-2 text-xs text-gray-500 dark:text-gray-400">
					{m.minCoverageHint()}
					{#if !appState.location}
						{m.minCoverageNeedLocation()}
					{/if}
				</p>
				<div class="flex flex-wrap gap-2">
					{#each coverageChips as chip (chip.obscuration)}
						{@const active =
							appState.filters.minObscuration === chip.obscuration}
						<Button
							size="xs"
							color={active ? "primary" : "alternative"}
							outline={!active}
							onclick={() => selectMinCoverage(chip.obscuration)}
						>
							{chip.label}
						</Button>
					{/each}
				</div>
			</div>
		</div>
	</AccordionItem>
</Accordion>
