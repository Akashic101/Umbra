<script lang="ts">
import { m } from "$lib/paraglide/messages.js";
import type { LocalEclipseType } from "$lib/types";

let {
	obscuration = 0,
	magnitude = 0,
	moonSunRatio = 1,
	localType = "partial",
	/** Degrees CCW from celestial north; −90 = from the left (legacy default). */
	positionAngleDeg = -90,
	size = "md",
}: {
	obscuration?: number;
	magnitude?: number;
	moonSunRatio?: number;
	localType?: LocalEclipseType;
	positionAngleDeg?: number;
	size?: "md" | "lg";
} = $props();

const sunR = 54;
const cy = 80;
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

/**
 * Centered for total/annular; offset by magnitude along sky PA for partial.
 * PA is CCW from celestial north; SVG y increases downward so north = up.
 */
const moonPos = $derived.by(() => {
	if (localType === "total" || localType === "annular") {
		return { x: cx, y: cy };
	}
	const mag =
		localType === "none"
			? 0
			: Math.min(1, Math.max(0, magnitude ?? obscuration ?? 0));
	const sep = Math.max(0, (1 - mag) * (sunR + moonR));
	const pa = (positionAngleDeg * Math.PI) / 180;
	return {
		x: cx + sep * Math.sin(pa),
		y: cy - sep * Math.cos(pa),
	};
});

/** Stable square frame for full moon travel in any PA (mag 0 → 1). */
const viewBox = $derived.by(() => {
	const pad = 12;
	const extent = sunR + 2 * moonR + pad;
	const left = cx - extent;
	const top = cy - extent;
	const frame = 2 * extent;
	return `${left} ${top} ${frame} ${frame}`;
});

const label = $derived.by(() => {
	if (localType === "none") {
		return m.diskNone();
	}
	if (localType === "total") {
		return m.diskTotal();
	}
	if (localType === "annular") {
		return m.diskAnnular();
	}
	return m.diskPartial({ percent: (obscuration * 100).toFixed(0) });
});
</script>

<svg
	{viewBox}
	class="mx-auto overflow-visible {size === 'lg' ? 'h-52 w-52' : 'h-32 w-40'}"
	role="img"
	aria-label={label}
>
	<title>{label}</title>
	<circle {cx} {cy} r={sunR} fill="#fbbf24" />
	<circle
		cx={moonPos.x}
		cy={moonPos.y}
		r={moonR}
		fill="#111827"
		class="dark:fill-gray-950"
	/>
	<circle {cx} {cy} r={sunR} fill="none" stroke="#f59e0b" stroke-width="2" />
</svg>
