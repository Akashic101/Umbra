<script lang="ts">
import type { LocalEclipseType } from "$lib/types";

let {
	obscuration = 0,
	magnitude = 0,
	moonSunRatio = 1,
	localType = "partial",
}: {
	obscuration?: number;
	magnitude?: number;
	moonSunRatio?: number;
	localType?: LocalEclipseType;
} = $props();

const sunR = 54;
const cy = 80;
/** Keep the Sun right of center so a left-offset Moon still fits in frame. */
const cx = 100;

const moonR = $derived.by(() => {
	const ratio = Math.max(0.2, moonSunRatio || 1);
	if (localType === "total") {
		return Math.max(sunR, sunR * ratio);
	}
	if (localType === "annular") {
		return Math.min(sunR * 0.98, sunR * ratio);
	}
	return sunR * ratio;
});

/** Centered for total/annular; offset left for partial. */
const moonCx = $derived.by(() => {
	if (localType === "total" || localType === "annular") {
		return cx;
	}
	const mag = Math.min(1, Math.max(0, magnitude || obscuration));
	const maxSep = sunR + moonR;
	const sep = Math.max(0, (1 - mag) * maxSep);
	return cx - sep;
});

const viewBox = $derived.by(() => {
	const pad = 10;
	const left = Math.min(cx - sunR, moonCx - moonR) - pad;
	const right = Math.max(cx + sunR, moonCx + moonR) + pad;
	const width = Math.max(160, right - left);
	return `${left} 0 ${width} 160`;
});

const label = $derived(
	localType === "total"
		? "Total eclipse: Moon covers the Sun"
		: localType === "annular"
			? "Annular eclipse: ring of sunlight"
			: `Partial eclipse: ${(obscuration * 100).toFixed(0)}% of the Sun covered`,
);
</script>

<svg
	{viewBox}
	class="mx-auto h-32 w-40 overflow-visible"
	role="img"
	aria-label={label}
>
	<title>{label}</title>
	<circle {cx} {cy} r={sunR} fill="#fbbf24" />
	<circle
		cx={moonCx}
		{cy}
		r={moonR}
		fill="#111827"
		class="dark:fill-gray-950"
	/>
	<circle {cx} {cy} r={sunR} fill="none" stroke="#f59e0b" stroke-width="2" />
</svg>
