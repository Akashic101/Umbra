<script lang="ts">
import {
	Accordion,
	AccordionItem,
	Button,
	Checkbox,
	Toggle,
} from "flowbite-svelte";
import { appState } from "$lib/app-state.svelte";
import { lunarState } from "$lib/lunar-state.svelte";
import { m } from "$lib/paraglide/messages.js";
import {
	ALL_LUNAR_ECLIPSE_TYPES,
	CATALOG_YEAR_MAX,
	CATALOG_YEAR_MIN,
	type LunarEclipseType,
	localIsoDate,
} from "$lib/types";

const labels: Record<LunarEclipseType, string> = {
	penumbral: m.lunarTypePenumbral(),
	partial: m.lunarTypePartial(),
	total: m.lunarTypeTotal(),
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

const umbralDurationChips: { label: string; seconds: number }[] = [
	{ label: m.chipAny(), seconds: 0 },
	{ label: m.chipGte10S(), seconds: 10 },
	{ label: m.chipGte1Min(), seconds: 60 },
	{ label: m.chipGte30Min(), seconds: 30 * 60 },
	{ label: m.chipGte1H(), seconds: 60 * 60 },
	{ label: m.chipGte2H(), seconds: 2 * 60 * 60 },
];

const magnitudeChips: { label: string; magnitude: number }[] = [
	{ label: m.chipAny(), magnitude: 0 },
	{ label: m.chipGte025(), magnitude: 0.25 },
	{ label: m.chipGte50Pct(), magnitude: 0.5 },
	{ label: m.chipGte075(), magnitude: 0.75 },
	{ label: m.chipGte1Mag(), magnitude: 1 },
];

function isYearChipActive(chip: YearChip): boolean {
	return (
		lunarState.filters.yearFrom === chip.from &&
		lunarState.filters.yearTo === chip.to &&
		lunarState.filters.dateFrom === chip.dateFrom &&
		lunarState.filters.dateTo === chip.dateTo
	);
}

function selectYears(chip: YearChip): void {
	lunarState.setFilters({
		yearFrom: chip.from,
		yearTo: chip.to,
		dateFrom: chip.dateFrom,
		dateTo: chip.dateTo,
	});
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
					{m.lunarTypeHint()}
				</p>
				<ul class="flex flex-col gap-2">
					{#each ALL_LUNAR_ECLIPSE_TYPES as type (type)}
						<li>
							<Checkbox
								color="primary"
								checked={lunarState.filters.types.includes(type)}
								onchange={() => lunarState.toggleType(type)}
							>
								{labels[type]}
							</Checkbox>
						</li>
					{/each}
				</ul>
			</div>
			<Toggle
				bind:checked={
					() => lunarState.filters.visibleHere,
					(value) => lunarState.setFilters({ visibleHere: value })
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
				<p class="mb-2 text-sm font-medium">{m.minUmbralDuration()}</p>
				<div class="flex flex-wrap gap-2">
					{#each umbralDurationChips as chip (chip.seconds)}
						{@const active =
							lunarState.filters.minUmbralDurationSeconds === chip.seconds}
						<Button
							size="xs"
							color={active ? "primary" : "alternative"}
							outline={!active}
							onclick={() =>
								lunarState.setFilters({
									minUmbralDurationSeconds: chip.seconds,
								})}
						>
							{chip.label}
						</Button>
					{/each}
				</div>
			</div>
			<div>
				<p class="mb-2 text-sm font-medium">{m.minUmbralMagnitude()}</p>
				<p class="mb-2 text-xs text-gray-500 dark:text-gray-400">
					{m.minUmbralMagnitudeHint()}
					{#if !appState.location}
						{m.minCoverageNeedLocation()}
					{/if}
				</p>
				<div class="flex flex-wrap gap-2">
					{#each magnitudeChips as chip (chip.magnitude)}
						{@const active =
							lunarState.filters.minUmbralMagnitude === chip.magnitude}
						<Button
							size="xs"
							color={active ? "primary" : "alternative"}
							outline={!active}
							onclick={() =>
								lunarState.setFilters({ minUmbralMagnitude: chip.magnitude })}
						>
							{chip.label}
						</Button>
					{/each}
				</div>
			</div>
		</div>
	</AccordionItem>
</Accordion>
