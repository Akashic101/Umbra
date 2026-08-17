<script lang="ts">
import { Button, Drawer, NavBrand, Navbar } from "flowbite-svelte";
import { BarsOutline } from "flowbite-svelte-icons";
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

const links = $derived.by(() => {
	locale;
	return [
		{ href: "/", label: m.navSolar(), current: isSolar },
		{ href: "/lunar", label: m.navLunar(), current: isLunar },
		{
			href: "/dictionary",
			label: m.navDictionary(),
			current: isDictionary,
		},
		{ href: "/settings", label: m.navSettings(), current: isSettings },
	];
});

let menuOpen = $state(false);

afterNavigate(() => {
	menuOpen = false;
});
</script>

<Navbar fluid class="border-b border-gray-200 dark:border-gray-700">
	<div class="flex w-full items-center gap-2">
		<NavBrand href="/">
			<img src={favicon} alt="" class="me-2 h-6 w-6">
			<span class="text-lg font-semibold">{m.brandName()}</span>
		</NavBrand>
		<nav
			class="ms-2 hidden items-center gap-3 text-sm md:flex"
			aria-label={m.navAria()}
		>
			{#each links as link (link.href)}
				<a
					href={link.href}
					aria-current={link.current ? "page" : undefined}
					class={[
						"text-gray-700 hover:underline dark:text-gray-200",
						link.current && "font-semibold",
					]}
				>
					{link.label}
				</a>
			{/each}
		</nav>
		<div class="ms-auto flex items-center gap-2">
			<FavoritesMenu />
			<Button
				color="alternative"
				size="sm"
				class="md:hidden"
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
	<p class="px-4 pt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
		{m.brandName()}
	</p>
	<nav class="mt-2 flex flex-col gap-1 px-2" aria-label={m.navAria()}>
		{#each links as link (link.href)}
			<a
				href={link.href}
				aria-current={link.current ? "page" : undefined}
				class={[
					"rounded-lg px-3 py-3 text-base text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700",
					link.current &&
						"bg-gray-100 font-semibold dark:bg-gray-700",
				]}
			>
				{link.label}
			</a>
		{/each}
	</nav>
</Drawer>
