/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from "$service-worker";

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `umbra-${version}`;
const TILE_CACHE = `umbra-tiles-${version}`;
const TILE_CACHE_MAX = 200;
const ASSETS = [...build, ...files];

sw.addEventListener("install", (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => sw.skipWaiting()),
	);
});

sw.addEventListener("activate", (event) => {
	event.waitUntil(
		caches.keys().then(async (keys) => {
			for (const key of keys) {
				if (key !== CACHE && key !== TILE_CACHE) {
					await caches.delete(key);
				}
			}
			await sw.clients.claim();
		}),
	);
});

sw.addEventListener("fetch", (event) => {
	const url = new URL(event.request.url);
	if (event.request.method !== "GET") {
		return;
	}

	if (url.hostname.endsWith("tile.openstreetmap.org")) {
		event.respondWith(cacheTiles(event.request));
		return;
	}

	if (url.origin !== sw.location.origin) {
		return;
	}

	event.respondWith(cacheFirst(event.request));
});

async function cacheFirst(request: Request): Promise<Response> {
	const cached = await caches.match(request);
	if (cached) {
		return cached;
	}
	const response = await fetch(request);
	if (response.ok) {
		const cache = await caches.open(CACHE);
		await cache.put(request, response.clone());
	}
	return response;
}

async function cacheTiles(request: Request): Promise<Response> {
	const cache = await caches.open(TILE_CACHE);
	const cached = await cache.match(request);
	if (cached) {
		return cached;
	}
	const response = await fetch(request);
	if (response.ok) {
		await cache.put(request, response.clone());
		const keys = await cache.keys();
		if (keys.length > TILE_CACHE_MAX) {
			await cache.delete(keys[0]);
		}
	}
	return response;
}
