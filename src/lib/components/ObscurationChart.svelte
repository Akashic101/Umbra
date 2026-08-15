<script lang="ts">
import { formatCentralWord } from "$lib/eclipse/detail-format";
import { m } from "$lib/paraglide/messages.js";
import type { ContactTimes, LocalEclipseType } from "$lib/types";

type ObscurationPoint = { iso: string; obscuration: number };

let {
	samples = [],
	contacts,
	localType = "partial",
}: {
	samples?: ObscurationPoint[];
	contacts: ContactTimes;
	localType?: LocalEclipseType;
} = $props();

const width = 320;
const height = 148;
const padL = 36;
const padR = 12;
const padT = 18;
const padB = 28;
const minObsc = 0;
const maxObsc = 1;

type ContactMarker = {
	key: "c1" | "c2" | "c3" | "c4";
	label: string;
	x: number;
	y: number;
};

const chart = $derived.by(() => {
	if (samples.length < 2) {
		return null;
	}
	const plotW = width - padL - padR;
	const plotH = height - padT - padB;
	const startMs = Date.parse(samples[0].iso);
	const endMs = Date.parse(samples.at(-1)!.iso);
	const spanMs = Math.max(endMs - startMs, 1);

	const points = samples.map((sample, index) => {
		const obsc = clamp01(sample.obscuration);
		const x = padL + (plotW * index) / (samples.length - 1);
		const y = padT + plotH * (1 - (obsc - minObsc) / (maxObsc - minObsc));
		return { x, y, iso: sample.iso, obsc, ms: Date.parse(sample.iso) };
	});
	const polyline = points
		.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
		.join(" ");
	const startLabel = formatHm(samples[0]?.iso ?? null);
	const endLabel = formatHm(samples.at(-1)?.iso ?? null);

	const markerDefs: { key: ContactMarker["key"]; iso: string | null }[] = [
		{ key: "c1", iso: contacts.c1 },
		{ key: "c2", iso: contacts.c2 },
		{ key: "c3", iso: contacts.c3 },
		{ key: "c4", iso: contacts.c4 },
	];

	const markers: ContactMarker[] = [];
	for (const def of markerDefs) {
		if (!def.iso) {
			continue;
		}
		const pos = pointAtIso(def.iso, samples, points, startMs, spanMs, plotW);
		if (!pos) {
			continue;
		}
		markers.push({
			key: def.key,
			label: def.key.toUpperCase(),
			x: pos.x,
			y: pos.y,
		});
	}

	const hasCentral =
		markers.some((m) => m.key === "c2") || markers.some((m) => m.key === "c3");
	const centralWord = formatCentralWord(localType);

	return {
		polyline,
		startLabel,
		endLabel,
		markers,
		hasCentral,
		centralWord,
		plotTop: padT,
	};
});

function clamp01(value: number): number {
	if (!Number.isFinite(value)) {
		return 0;
	}
	return Math.min(1, Math.max(0, value));
}

function pointAtIso(
	iso: string,
	series: ObscurationPoint[],
	points: { x: number; y: number; ms: number; obsc: number }[],
	startMs: number,
	spanMs: number,
	plotW: number,
): { x: number; y: number } | null {
	const ms = Date.parse(iso);
	if (!Number.isFinite(ms)) {
		return null;
	}
	const x = padL + (plotW * (ms - startMs)) / spanMs;
	const obsc = obscurationAtMs(ms, series);
	if (obsc === null) {
		return null;
	}
	const y =
		padT +
		(height - padT - padB) * (1 - (obsc - minObsc) / (maxObsc - minObsc));
	const exact = points.find((p) => p.ms === ms);
	if (exact) {
		return { x: exact.x, y: exact.y };
	}
	return { x, y };
}

function obscurationAtMs(
	ms: number,
	series: ObscurationPoint[],
): number | null {
	if (series.length === 0) {
		return null;
	}
	const firstMs = Date.parse(series[0].iso);
	const lastMs = Date.parse(series.at(-1)!.iso);
	if (ms <= firstMs) {
		return clamp01(series[0].obscuration);
	}
	if (ms >= lastMs) {
		return clamp01(series.at(-1)!.obscuration);
	}
	for (let i = 0; i < series.length - 1; i++) {
		const aMs = Date.parse(series[i].iso);
		const bMs = Date.parse(series[i + 1].iso);
		if (ms >= aMs && ms <= bMs) {
			if (bMs === aMs) {
				return clamp01(series[i].obscuration);
			}
			const t = (ms - aMs) / (bMs - aMs);
			return clamp01(
				series[i].obscuration +
					t * (series[i + 1].obscuration - series[i].obscuration),
			);
		}
	}
	return null;
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
</script>

{#if chart}
	<svg
		viewBox="0 0 {width} {height}"
		class="h-auto w-full"
		role="img"
		aria-label={m.obscurationAria()}
	>
		<title>{m.obscurationTitle()}</title>
		{#each chart.markers as marker (marker.key)}
			<line
				x1={marker.x}
				x2={marker.x}
				y1={chart.plotTop}
				y2={marker.y}
				class="stroke-gray-400 dark:stroke-gray-500"
				stroke-dasharray="2 2"
				stroke-width="1"
				opacity="0.85"
			/>
		{/each}
		<polyline
			fill="none"
			class="stroke-primary-600 dark:stroke-primary-400"
			stroke-width="2"
			stroke-linejoin="round"
			stroke-linecap="round"
			points={chart.polyline}
		/>
		{#each chart.markers as marker (marker.key)}
			<circle
				cx={marker.x}
				cy={marker.y}
				r="2.5"
				class="fill-primary-700 dark:fill-primary-300"
			/>
			<text
				x={marker.x}
				y={Math.max(10, marker.y - 6)}
				text-anchor="middle"
				class="fill-gray-600 text-[8px] font-medium dark:fill-gray-300"
			>
				{marker.label}
			</text>
		{/each}
		<text
			x={padL}
			y={height - 8}
			class="fill-gray-500 text-[9px] dark:fill-gray-400"
		>
			{chart.startLabel}
		</text>
		<text
			x={width - padR}
			y={height - 8}
			text-anchor="end"
			class="fill-gray-500 text-[9px] dark:fill-gray-400"
		>
			{chart.endLabel}
		</text>
		<text
			x={4}
			y={padT + 4}
			class="fill-gray-500 text-[9px] dark:fill-gray-400"
		>
			100%
		</text>
		<text
			x={4}
			y={height - padB}
			class="fill-gray-500 text-[9px] dark:fill-gray-400"
		>
			0%
		</text>
	</svg>
	{#if chart.hasCentral}
		<p class="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
			{m.chartContactLegend({ centralWord: chart.centralWord })}
		</p>
	{/if}
{:else}
	<p class="text-sm text-gray-500 dark:text-gray-400">
		{m.noObscurationSeries()}
	</p>
{/if}
