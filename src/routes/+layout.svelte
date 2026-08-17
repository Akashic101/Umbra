<script lang="ts">
import "./layout.css";
import { DarkMode, NavBrand, Navbar } from "flowbite-svelte";
import { goto } from "$app/navigation";
import { page } from "$app/state";
import favicon from "$lib/assets/favicon.svg";
import FavoritesMenu from "$lib/components/FavoritesMenu.svelte";
import LocaleSwitcher from "$lib/components/LocaleSwitcher.svelte";
import { isTauri, pathFromDeepLink } from "$lib/env/tauri";
import { m } from "$lib/paraglide/messages.js";
import { getLocale, getTextDirection } from "$lib/paraglide/runtime";

let { children } = $props();

const path = $derived(page.url.pathname);
const isLunar = $derived(path === "/lunar" || path.startsWith("/lunar/"));
const isDictionary = $derived(
	path === "/dictionary" || path.startsWith("/dictionary/"),
);
const isSolar = $derived(path === "/" || path.startsWith("/details"));

// Prerendered HTML uses the base locale; correct lang/dir after the
// cookie, localStorage, or browser language is known.
$effect(() => {
	const locale = getLocale();
	document.documentElement.lang = locale;
	document.documentElement.dir = getTextDirection(locale);
});

$effect(() => {
	if (!isTauri()) {
		return;
	}
	let cancelled = false;
	let unlisten: (() => void) | undefined;
	void (async () => {
		const { getCurrent, onOpenUrl } = await import(
			"@tauri-apps/plugin-deep-link"
		);
		if (cancelled) {
			return;
		}
		const startUrls = await getCurrent();
		const first = startUrls?.[0];
		if (first) {
			await goto(pathFromDeepLink(first));
		}
		unlisten = await onOpenUrl((urls) => {
			const url = urls[0];
			if (url) {
				void goto(pathFromDeepLink(url));
			}
		});
	})();
	return () => {
		cancelled = true;
		unlisten?.();
	};
});

$effect(() => {
	if (!isTauri()) {
		return;
	}
	async function onClick(event: MouseEvent): Promise<void> {
		const target = event.target;
		if (!(target instanceof Element)) {
			return;
		}
		const anchor = target.closest("a");
		if (!anchor) {
			return;
		}
		const href = anchor.getAttribute("href");
		if (!href || !(href.startsWith("http://") || href.startsWith("https://"))) {
			return;
		}
		event.preventDefault();
		const { openUrl } = await import("@tauri-apps/plugin-opener");
		await openUrl(href);
	}
	document.addEventListener("click", onClick);
	return () => document.removeEventListener("click", onClick);
});
</script>

<svelte:head>
	<title>{m.appTitle()}</title>
	<meta name="description" content={m.appDescription()}>
	<link rel="icon" href={favicon}>
</svelte:head>

<div
	class="flex h-[100dvh] flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
>
	<Navbar fluid class="border-b border-gray-200 dark:border-gray-700">
		<NavBrand href="/">
			<img src={favicon} alt="" class="me-2 h-6 w-6">
			<span class="text-lg font-semibold">{m.brandName()}</span>
		</NavBrand>
		<nav class="ms-4 flex items-center gap-3 text-sm">
			<a
				href="/"
				class="text-gray-700 hover:underline dark:text-gray-200"
				class:font-semibold={isSolar}
			>
				{m.navSolar()}
			</a>
			<a
				href="/lunar"
				class="text-gray-700 hover:underline dark:text-gray-200"
				class:font-semibold={isLunar}
			>
				{m.navLunar()}
			</a>
			<a
				href="/dictionary"
				class="text-gray-700 hover:underline dark:text-gray-200"
				class:font-semibold={isDictionary}
			>
				{m.navDictionary()}
			</a>
		</nav>
		<div class="flex items-center gap-2">
			<FavoritesMenu />
			<LocaleSwitcher />
			<DarkMode />
		</div>
	</Navbar>
	<div class="min-h-0 flex-1">
		{@render children()}
	</div>
</div>
