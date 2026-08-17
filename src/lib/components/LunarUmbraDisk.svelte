<script lang="ts">
import { m } from "$lib/paraglide/messages.js";
import type { LunarLocalType } from "$lib/types";

let {
	umbralMagnitude = 0,
	penumbralMagnitude = 0,
	localType = "partial",
	size = "md",
}: {
	umbralMagnitude?: number;
	penumbralMagnitude?: number;
	localType?: LunarLocalType;
	size?: "md" | "lg";
} = $props();

const clipId = `lunar-moon-clip-${Math.random().toString(36).slice(2, 10)}`;
const cx = 100;
const cy = 80;
const moonR = 36;
const umbraR = moonR * 2.6;
const penumbraR = umbraR + moonR * 1.15;

const umbraPos = $derived.by(() => {
	const mag = Math.max(0, umbralMagnitude);
	const sep = Math.max(0, umbraR + moonR - mag * 2 * moonR);
	return { x: cx + sep, y: cy };
});

const label = $derived.by(() => {
	if (
		localType === "none" ||
		(umbralMagnitude <= 0 && penumbralMagnitude <= 0)
	) {
		return m.lunarDiskNone();
	}
	if (localType === "total" || umbralMagnitude >= 1) {
		return m.lunarDiskTotal();
	}
	if (localType === "partial" || umbralMagnitude > 0) {
		return m.lunarDiskPartial({ magnitude: umbralMagnitude.toFixed(3) });
	}
	return m.lunarDiskPenumbral();
});

const viewBox = $derived.by(() => {
	const extent = penumbraR + 16;
	return `${cx - extent} ${cy - extent} ${extent * 2} ${extent * 2}`;
});
</script>

<svg
	{viewBox}
	class="mx-auto overflow-visible {size === 'lg' ? 'h-52 w-52' : 'h-32 w-40'}"
	role="img"
	aria-label={label}
>
	<title>{label}</title>
	<circle
		cx={umbraPos.x}
		cy={umbraPos.y}
		r={penumbraR}
		fill="#64748b"
		opacity="0.22"
	/>
	<circle {cx} {cy} r={moonR} fill="#e5e7eb" class="dark:fill-gray-300" />
	{#if umbralMagnitude > 0 || localType === "partial" || localType === "total"}
		<clipPath id={clipId}>
			<circle {cx} {cy} r={moonR} />
		</clipPath>
		<circle
			cx={umbraPos.x}
			cy={umbraPos.y}
			r={umbraR}
			fill="#111827"
			opacity="0.82"
			clip-path={`url(#${clipId})`}
			class="dark:fill-gray-950"
		/>
	{/if}
	<circle {cx} {cy} r={moonR} fill="none" stroke="#9ca3af" stroke-width="1.5" />
</svg>
