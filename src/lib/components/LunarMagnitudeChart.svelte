<script lang="ts">
import {
	chartXAtMs,
	formatChartHm,
	type LunarChartMarkerKey,
	lunarContactMarkerDefs,
	thirtyMinuteTickMs,
} from "$lib/eclipse/chart-time";
import { m } from "$lib/paraglide/messages.js";
import type { LunarContactTimes } from "$lib/types";

type MagnitudePoint = { iso: string; umbralMagnitude: number };

let {
	samples = [],
	contacts,
}: {
	samples?: MagnitudePoint[];
	contacts: LunarContactTimes;
} = $props();

const width = 320;
const height = 148;
const padL = 36;
const padR = 12;
const padT = 18;
const padB = 32;
const minMag = 0;

type ContactMarker = {
	key: LunarChartMarkerKey;
	label: string;
	x: number;
	y: number;
};

type TimeTick = { ms: number; x: number; label: string; showLabel: boolean };

const chart = $derived.by(() => {
	if (samples.length < 2) {
		return null;
	}
	const peak = Math.max(1, ...samples.map((s) => s.umbralMagnitude), 0);
	const maxMag = peak * 1.05;
	const plotW = width - padL - padR;
	const plotH = height - padT - padB;
	const plotBottom = padT + plotH;
	const lastSample = samples[samples.length - 1];
	if (!lastSample) {
		return null;
	}
	const startMs = Date.parse(samples[0].iso);
	const endMs = Date.parse(lastSample.iso);
	const spanMs = Math.max(endMs - startMs, 1);

	const points = samples.map((sample, index) => {
		const mag = Math.max(0, sample.umbralMagnitude);
		const x = padL + (plotW * index) / (samples.length - 1);
		const y = padT + plotH * (1 - (mag - minMag) / (maxMag - minMag));
		return { x, y, iso: sample.iso, mag, ms: Date.parse(sample.iso) };
	});
	const polyline = points
		.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
		.join(" ");
	const startLabel = formatChartHm(startMs);
	const endLabel = formatChartHm(endMs);

	const timeTicks: TimeTick[] = thirtyMinuteTickMs(startMs, endMs).map((ms) => {
		const x = chartXAtMs(ms, startMs, spanMs, padL, plotW);
		return {
			ms,
			x,
			label: formatChartHm(ms),
			showLabel: x > padL + 18 && x < width - padR - 18,
		};
	});

	const markers: ContactMarker[] = [];
	for (const def of lunarContactMarkerDefs(contacts)) {
		if (!def.iso) {
			continue;
		}
		const pos = pointAtIso(
			def.iso,
			samples,
			points,
			startMs,
			spanMs,
			plotW,
			maxMag,
		);
		if (!pos) {
			continue;
		}
		markers.push({
			key: def.key,
			label: def.label,
			x: pos.x,
			y: pos.y,
		});
	}

	const hasCentral =
		markers.some((row) => row.key === "u2") ||
		markers.some((row) => row.key === "u3");

	return {
		polyline,
		startLabel,
		endLabel,
		timeTicks,
		markers,
		hasCentral,
		maxMag,
		plotTop: padT,
		plotBottom,
	};
});

function pointAtIso(
	iso: string,
	series: MagnitudePoint[],
	points: { x: number; y: number; ms: number; mag: number }[],
	startMs: number,
	spanMs: number,
	plotW: number,
	maxMag: number,
): { x: number; y: number } | null {
	const ms = Date.parse(iso);
	if (!Number.isFinite(ms)) {
		return null;
	}
	const x = chartXAtMs(ms, startMs, spanMs, padL, plotW);
	const mag = magnitudeAtMs(ms, series);
	if (mag === null) {
		return null;
	}
	const y =
		padT + (height - padT - padB) * (1 - (mag - minMag) / (maxMag - minMag));
	const exact = points.find((p) => p.ms === ms);
	if (exact) {
		return { x: exact.x, y: exact.y };
	}
	return { x, y };
}

function magnitudeAtMs(ms: number, series: MagnitudePoint[]): number | null {
	if (series.length === 0) {
		return null;
	}
	const last = series[series.length - 1];
	if (!last) {
		return null;
	}
	const firstMs = Date.parse(series[0].iso);
	const lastMs = Date.parse(last.iso);
	if (ms <= firstMs) {
		return Math.max(0, series[0].umbralMagnitude);
	}
	if (ms >= lastMs) {
		return Math.max(0, last.umbralMagnitude);
	}
	for (let i = 0; i < series.length - 1; i++) {
		const aMs = Date.parse(series[i].iso);
		const bMs = Date.parse(series[i + 1].iso);
		if (ms >= aMs && ms <= bMs) {
			if (bMs === aMs) {
				return Math.max(0, series[i].umbralMagnitude);
			}
			const t = (ms - aMs) / (bMs - aMs);
			return Math.max(
				0,
				series[i].umbralMagnitude +
					t * (series[i + 1].umbralMagnitude - series[i].umbralMagnitude),
			);
		}
	}
	return null;
}
</script>

{#if chart}
	<svg
		viewBox="0 0 {width} {height}"
		class="h-auto w-full"
		role="img"
		aria-label={m.umbralMagChartAria()}
	>
		<title>{m.umbralMagChartTitle()}</title>
		{#each chart.timeTicks as tick (tick.ms)}
			<line
				x1={tick.x}
				x2={tick.x}
				y1={chart.plotTop}
				y2={chart.plotBottom}
				class="stroke-gray-300 dark:stroke-gray-600"
				stroke-width="1"
				opacity="0.5"
			/>
			{#if tick.showLabel}
				<text
					x={tick.x}
					y={height - 6}
					text-anchor="middle"
					class="fill-gray-500 text-[7px] dark:fill-gray-400"
				>
					{tick.label}
				</text>
			{/if}
		{/each}
		{#each chart.markers as marker (marker.key)}
			<line
				x1={marker.x}
				x2={marker.x}
				y1={chart.plotTop}
				y2={chart.plotBottom}
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
			{chart.maxMag.toFixed(1)}
		</text>
		<text
			x={4}
			y={height - padB}
			class="fill-gray-500 text-[9px] dark:fill-gray-400"
		>
			0
		</text>
	</svg>
	{#if chart.hasCentral}
		<p class="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
			{m.lunarChartLegend()}
		</p>
	{/if}
{:else}
	<p class="text-sm text-gray-500 dark:text-gray-400">
		{m.noUmbralMagSeries()}
	</p>
{/if}
