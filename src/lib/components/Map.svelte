<script lang="ts">
import type { CircleMarker, LayerGroup, Map as LeafletMap } from "leaflet";
import type { Attachment } from "svelte/attachments";
import { toLeafletRing } from "$lib/map/geo";
import { m } from "$lib/paraglide/messages.js";
import type { EclipsePaths, LatLon, ObserverLocation } from "$lib/types";
import "leaflet/dist/leaflet.css";

let {
	location = null,
	paths = null,
	zenith = null,
	onSelect,
}: {
	location?: ObserverLocation | null;
	paths?: EclipsePaths | null;
	zenith?: LatLon | null;
	onSelect: (lat: number, lon: number) => void;
} = $props();

let map: LeafletMap | undefined;
let marker: CircleMarker | undefined;
let zenithMarker: CircleMarker | undefined;
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
			tapTolerance: 15,
		}).setView([20, 0], 2);
		L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
			maxZoom: 19,
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
		}).addTo(map);
		overlay = L.layerGroup().addTo(map);
		map.on("click", (event) => {
			onSelect(event.latlng.lat, event.latlng.lng);
		});
		syncMarker();
		syncZenith();
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
		zenithMarker = undefined;
		overlay = undefined;
		leaflet = undefined;
	};
};

$effect(() => {
	location;
	syncMarker();
});

$effect(() => {
	zenith;
	syncZenith();
});

$effect(() => {
	paths;
	syncPaths();
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
				radius: 8,
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

function syncZenith(): void {
	if (!map || !leaflet) {
		return;
	}
	if (!zenith) {
		zenithMarker?.remove();
		zenithMarker = undefined;
		return;
	}
	const latlng: [number, number] = [zenith.lat, zenith.lon];
	if (!zenithMarker) {
		zenithMarker = leaflet
			.circleMarker(latlng, {
				radius: 7,
				color: "#b45309",
				fillColor: "#f59e0b",
				fillOpacity: 1,
				weight: 2,
			})
			.bindTooltip(m.zenithMarkerAria(), { direction: "top" })
			.addTo(map);
	} else {
		zenithMarker.setLatLng(latlng);
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
</script>

<div
	{@attach mapAttachment}
	class="h-full w-full min-h-[50dvh]"
	role="application"
	aria-label={m.mapAria()}
></div>
