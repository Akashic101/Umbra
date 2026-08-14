<script lang="ts">
import type { CircleMarker, LayerGroup, Map as LeafletMap } from "leaflet";
import type { Attachment } from "svelte/attachments";
import { toLeafletRing } from "$lib/map/geo";
import type { EclipsePaths, ObserverLocation } from "$lib/types";
import "leaflet/dist/leaflet.css";

let {
	location = null,
	paths = null,
}: {
	location?: ObserverLocation | null;
	paths?: EclipsePaths | null;
} = $props();

let map: LeafletMap | undefined;
let marker: CircleMarker | undefined;
let overlay: LayerGroup | undefined;
let leaflet: typeof import("leaflet") | undefined;

const mapAttachment: Attachment<HTMLDivElement> = (node) => {
	let destroyed = false;
	let resizeObserver: ResizeObserver | undefined;
	void import("leaflet").then((L) => {
		if (destroyed) {
			return;
		}
		leaflet = L;
		map = L.map(node, {
			zoomControl: true,
			attributionControl: true,
			dragging: true,
			scrollWheelZoom: false,
		}).setView([20, 0], 2);
		L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
			maxZoom: 19,
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
		}).addTo(map);
		overlay = L.layerGroup().addTo(map);
		syncMarker();
		syncPaths();
		map.invalidateSize();
		resizeObserver = new ResizeObserver(() => map?.invalidateSize());
		resizeObserver.observe(node);
	});
	return () => {
		destroyed = true;
		resizeObserver?.disconnect();
		map?.remove();
		map = undefined;
		marker = undefined;
		overlay = undefined;
		leaflet = undefined;
	};
};

$effect(() => {
	location;
	syncMarker();
	fitView();
});

$effect(() => {
	paths;
	syncPaths();
	fitView();
});

function syncMarker(): void {
	if (!map || !leaflet) {
		return;
	}
	if (!location) {
		marker?.remove();
		marker = undefined;
		return;
	}
	const latlng: [number, number] = [location.lat, location.lon];
	if (!marker) {
		marker = leaflet
			.circleMarker(latlng, {
				radius: 7,
				color: "#1d4ed8",
				fillColor: "#3b82f6",
				fillOpacity: 1,
				weight: 2,
			})
			.addTo(map);
	} else {
		marker.setLatLng(latlng);
	}
}

function syncPaths(): void {
	if (!map || !leaflet || !overlay) {
		return;
	}
	overlay.clearLayers();
	if (!paths) {
		return;
	}
	if (paths.penumbra.length) {
		leaflet
			.polygon(toLeafletRing(paths.penumbra), {
				color: "#2563eb",
				weight: 1,
				fillColor: "#3b82f6",
				fillOpacity: 0.18,
			})
			.addTo(overlay);
	}
	if (paths.umbra.length) {
		leaflet
			.polygon(toLeafletRing(paths.umbra), {
				color: "#111827",
				weight: 1,
				fillColor: "#111827",
				fillOpacity: 0.45,
			})
			.addTo(overlay);
	}
	if (paths.centralLine.length) {
		leaflet
			.polyline(toLeafletRing(paths.centralLine), {
				color: "#dc2626",
				weight: 2,
			})
			.addTo(overlay);
	}
}

function fitView(): void {
	if (!map || !leaflet) {
		return;
	}
	// Zoom around the observer so the preview is useful locally; full penumbra
	// bounds are often continent-scale and keep the map too zoomed out.
	if (location) {
		const radiusM = paths?.umbra.length ? 1_200_000 : 2_000_000;
		const bounds = leaflet.latLng(location.lat, location.lon).toBounds(radiusM);
		map.fitBounds(bounds, { padding: [12, 12], maxZoom: 8 });
		return;
	}
	const boundsPoints: [number, number][] = [];
	if (paths?.umbra.length) {
		boundsPoints.push(...toLeafletRing(paths.umbra));
	} else if (paths?.penumbra.length) {
		boundsPoints.push(...toLeafletRing(paths.penumbra));
	}
	if (boundsPoints.length >= 2) {
		map.fitBounds(boundsPoints, { padding: [16, 16], maxZoom: 7 });
	}
}
</script>

<div
	{@attach mapAttachment}
	class="h-64 w-full min-h-56 rounded-md"
	role="application"
	aria-label="Eclipse path preview map"
></div>
