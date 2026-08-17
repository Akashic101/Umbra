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

type AltitudePoint = { iso: string; altitudeDeg: number };

let {
	samples = [],
	contacts,
}: {
	samples?: AltitudePoint[];
	contacts: LunarContactTimes;
} = $props();

const width = 320;
const height = 148;
const padL = 36;
const padR = 12;
const padT = 18;
const padB = 32;

type ContactMarker = {
	key: LunarChartMarkerKey;
	label: string;
	x: number;
	y: number;
};

type ChartPoint = { x: number; y: number; alt: number };
type AltitudeSegment = { above: boolean; points: string };
type TimeTick = { ms: number; x: number; label: string; showLabel: boolean };

const chart = $derived.by(() => {
	if (samples.length < 2) {
		return null;
	}
	const alts = samples.map((s) => s.altitudeDeg);
	let minAlt = Math.min(...alts, 0);
	let maxAlt = Math.max(...alts, 0);
	if (maxAlt - minAlt < 5) {
		maxAlt += 2.5;
		minAlt -= 2.5;
	}
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
		const x = padL + (plotW * index) / (samples.length - 1);
		const y =
			padT + plotH * (1 - (sample.altitudeDeg - minAlt) / (maxAlt - minAlt));
		return {
			x,
			y,
			iso: sample.iso,
			alt: sample.altitudeDeg,
			ms: Date.parse(sample.iso),
		};
	});
	const zeroY =
		minAlt <= 0 && maxAlt >= 0
			? padT + plotH * (1 - (0 - minAlt) / (maxAlt - minAlt))
			: null;
	const segments = splitAltitudeSegments(points, zeroY);
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
			plotH,
			minAlt,
			maxAlt,
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
		markers.some((m) => m.key === "u2") || markers.some((m) => m.key === "u3");

	return {
		points,
		segments,
		zeroY,
		minAlt,
		maxAlt,
		startLabel,
		endLabel,
		timeTicks,
		markers,
		hasCentral,
		plotTop: padT,
		plotBottom,
	};
});

function splitAltitudeSegments(
	points: ChartPoint[],
	zeroY: number | null,
): AltitudeSegment[] {
	if (points.length < 2) {
		return [];
	}

	const segments: AltitudeSegment[] = [];
	let currentAbove = points[0].alt >= 0;
	let current: ChartPoint[] = [points[0]];

	const flush = () => {
		if (current.length < 2) {
			return;
		}
		segments.push({
			above: currentAbove,
			points: current
				.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
				.join(" "),
		});
	};

	for (let i = 1; i < points.length; i++) {
		const prev = points[i - 1];
		const next = points[i];
		const nextAbove = next.alt >= 0;

		// Same side of horizon (≥0 vs <0), including samples at exactly 0°
		if (prev.alt >= 0 === next.alt >= 0) {
			current.push(next);
			continue;
		}

		// Crossing 0°: interpolate a point on the horizon
		const denom = next.alt - prev.alt;
		const t = denom === 0 ? 0 : -prev.alt / denom;
		const crossing: ChartPoint = {
			x: prev.x + t * (next.x - prev.x),
			y: zeroY !== null ? zeroY : prev.y + t * (next.y - prev.y),
			alt: 0,
		};

		current.push(crossing);
		flush();

		currentAbove = nextAbove;
		current = [crossing, next];
	}

	flush();
	return segments;
}

function pointAtIso(
	iso: string,
	series: AltitudePoint[],
	points: { x: number; y: number; ms: number; alt: number }[],
	startMs: number,
	spanMs: number,
	plotW: number,
	plotH: number,
	minAlt: number,
	maxAlt: number,
): { x: number; y: number } | null {
	const ms = Date.parse(iso);
	if (!Number.isFinite(ms)) {
		return null;
	}
	const x = chartXAtMs(ms, startMs, spanMs, padL, plotW);
	const alt = altitudeAtMs(ms, series);
	if (alt === null) {
		return null;
	}
	const y = padT + plotH * (1 - (alt - minAlt) / (maxAlt - minAlt));
	// Prefer curve x when ms lands on a sample (avoids tiny float drift)
	const exact = points.find((p) => p.ms === ms);
	if (exact) {
		return { x: exact.x, y: exact.y };
	}
	return { x, y };
}

function altitudeAtMs(ms: number, series: AltitudePoint[]): number | null {
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
		return series[0].altitudeDeg;
	}
	if (ms >= lastMs) {
		return last.altitudeDeg;
	}
	for (let i = 0; i < series.length - 1; i++) {
		const aMs = Date.parse(series[i].iso);
		const bMs = Date.parse(series[i + 1].iso);
		if (ms >= aMs && ms <= bMs) {
			if (bMs === aMs) {
				return series[i].altitudeDeg;
			}
			const t = (ms - aMs) / (bMs - aMs);
			return (
				series[i].altitudeDeg +
				t * (series[i + 1].altitudeDeg - series[i].altitudeDeg)
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
		aria-label={m.moonAltitudeAria()}
	>
		<title>{m.moonAltitudeTitle()}</title>
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
		{#if chart.zeroY !== null}
			<line
				x1={padL}
				x2={width - padR}
				y1={chart.zeroY}
				y2={chart.zeroY}
				class="stroke-gray-300 dark:stroke-gray-600"
				stroke-dasharray="4 3"
				stroke-width="1"
			/>
			<text
				x={4}
				y={chart.zeroY + 3}
				class="fill-gray-500 text-[9px] dark:fill-gray-400"
			>
				0°
			</text>
		{/if}
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
		{#each chart.segments as segment, i (`${segment.above}-${i}`)}
			<polyline
				fill="none"
				class={segment.above
					? "stroke-primary-600 dark:stroke-primary-400"
					: "stroke-slate-500 dark:stroke-slate-400"}
				stroke-width="2"
				stroke-linejoin="round"
				stroke-linecap="round"
				points={segment.points}
			/>
		{/each}
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
		{#if chart.zeroY === null || Math.round(chart.maxAlt) !== 0}
			<text
				x={4}
				y={padT + 4}
				class="fill-gray-500 text-[9px] dark:fill-gray-400"
			>
				{Math.round(chart.maxAlt)}°
			</text>
		{/if}
		{#if chart.zeroY === null || Math.round(chart.minAlt) !== 0}
			<text
				x={4}
				y={height - padB}
				class="fill-gray-500 text-[9px] dark:fill-gray-400"
			>
				{Math.round(chart.minAlt)}°
			</text>
		{/if}
	</svg>
	{#if chart.hasCentral}
		<p class="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
			{m.lunarChartLegend()}
		</p>
	{/if}
{:else}
	<p class="text-sm text-gray-500 dark:text-gray-400">
		{m.noAltitudeSeries()}
	</p>
{/if}
