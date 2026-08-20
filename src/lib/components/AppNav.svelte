<script lang="ts">
import { Button, Drawer, NavBrand, Navbar } from "flowbite-svelte";
import {
	BarsOutline,
	BookOpenOutline,
	CogOutline,
	MoonOutline,
	SunOutline,
} from "flowbite-svelte-icons";
import type { Component } from "svelte";
import { afterNavigate } from "$app/navigation";
import { page } from "$app/state";
import favicon from "$lib/assets/favicon.svg";
import FavoritesMenu from "$lib/components/FavoritesMenu.svelte";
import { m } from "$lib/paraglide/messages.js";
import { getLocale } from "$lib/paraglide/runtime";

const path = $derived(page.url.pathname);
const locale = $derived(getLocale());
const isLunar = $derived(path === "/lunar" || path.startsWith("/lunar/"));
const isDictionary = $derived(
	path === "/dictionary" || path.startsWith("/dictionary/"),
);
const isSettings = $derived(
	path === "/settings" || path.startsWith("/settings/"),
);
const isSolar = $derived(path === "/" || path.startsWith("/details"));

type NavLink = {
	href: string;
	label: string;
	current: boolean;
	icon: Component<{ class?: string }>;
};

const modes = $derived.by((): NavLink[] => {
	locale;
	return [
		{
			href: "/",
			label: m.navSolar(),
			current: isSolar,
			icon: SunOutline,
		},
		{
			href: "/lunar",
			label: m.navLunar(),
			current: isLunar,
			icon: MoonOutline,
		},
		{
			href: "/dictionary",
			label: m.navDictionary(),
			current: isDictionary,
			icon: BookOpenOutline,
		},
	];
});

const drawerLinks = $derived.by((): NavLink[] => {
	locale;
	return [
		...modes,
		{
			href: "/settings",
			label: m.navSettings(),
			current: isSettings,
			icon: CogOutline,
		},
	];
});

let menuOpen = $state(false);

afterNavigate(() => {
	menuOpen = false;
});
</script>

<Navbar
	fluid
	class="min-h-14 border-b border-gray-200 bg-white/90 px-3 backdrop-blur dark:border-gray-700 dark:bg-gray-900/90 sm:px-4"
>
	<div class="flex w-full items-center gap-3">
		<NavBrand href="/" class="shrink-0 gap-0">
			<img src={favicon} alt="" class="me-2.5 h-6 w-6">
			<span class="text-base font-semibold tracking-tight text-gray-900 dark:text-white">
				{m.brandName()}
			</span>
		</NavBrand>

		<nav
			class="ms-1 hidden items-center rounded-lg bg-gray-100 p-1 dark:bg-gray-800 md:flex"
			aria-label={m.navAria()}
		>
			{#each modes as link (link.href)}
				{@const Icon = link.icon}
				<a
					href={link.href}
					aria-current={link.current ? "page" : undefined}
					class={[
						"inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
						link.current
							? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
							: "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200",
					]}
				>
					<Icon class="h-4 w-4 shrink-0 opacity-80" />
					{link.label}
				</a>
			{/each}
		</nav>

		<div class="ms-auto flex items-center gap-1.5">
			<FavoritesMenu />
			<Button
				color="alternative"
				size="sm"
				href="/settings"
				class="h-9 w-9 !p-0"
				aria-label={m.navSettings()}
				aria-current={isSettings ? "page" : undefined}
			>
				<CogOutline class="h-4 w-4" />
			</Button>
			<Button
				color="alternative"
				size="sm"
				class="h-9 w-9 !p-0 md:hidden"
				aria-expanded={menuOpen}
				aria-controls="app-menu"
				aria-label={m.navMenuAria()}
				onclick={() => (menuOpen = true)}
			>
				<BarsOutline class="h-5 w-5" />
			</Button>
		</div>
	</div>
</Navbar>

<Drawer
	bind:open={menuOpen}
	id="app-menu"
	placement="left"
	class="w-72 max-w-[85vw] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:hidden"
>
	<p
		class="px-4 pt-3 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400"
	>
		{m.brandName()}
	</p>
	<nav class="mt-3 flex flex-col gap-1 px-2" aria-label={m.navAria()}>
		{#each drawerLinks as link (link.href)}
			{@const Icon = link.icon}
			<a
				href={link.href}
				aria-current={link.current ? "page" : undefined}
				class={[
					"inline-flex items-center gap-3 rounded-lg px-3 py-3 text-base transition-colors",
					link.current
						? "bg-primary-50 font-semibold text-primary-800 dark:bg-primary-900/40 dark:text-primary-100"
						: "font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700",
				]}
			>
				<Icon class="h-5 w-5 shrink-0 opacity-80" />
				{link.label}
			</a>
		{/each}
	</nav>
</Drawer>
