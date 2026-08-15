<script lang="ts">
import "./layout.css";
import { DarkMode, NavBrand, Navbar } from "flowbite-svelte";
import favicon from "$lib/assets/favicon.svg";
import FavoritesMenu from "$lib/components/FavoritesMenu.svelte";
import LocaleSwitcher from "$lib/components/LocaleSwitcher.svelte";
import { m } from "$lib/paraglide/messages.js";
import {
	getLocale,
	getTextDirection,
	localizeHref,
} from "$lib/paraglide/runtime";

let { children } = $props();

// The static SPA fallback is prerendered with the base locale, so localized
// routes served from it need their document language corrected at runtime.
$effect(() => {
	const locale = getLocale();
	document.documentElement.lang = locale;
	document.documentElement.dir = getTextDirection(locale);
});
</script>

<svelte:head>
	<title>{m.appTitle()}</title>
	<meta name="description" content={m.appDescription()}>
	<link rel="icon" href={favicon}>
</svelte:head>

<div class="flex h-[100dvh] flex-col overflow-hidden">
	<Navbar fluid class="border-b border-gray-200 dark:border-gray-700">
		<NavBrand href={localizeHref("/")}>
			<img src={favicon} alt="" class="me-2 h-6 w-6">
			<span class="text-lg font-semibold">{m.brandName()}</span>
		</NavBrand>
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
