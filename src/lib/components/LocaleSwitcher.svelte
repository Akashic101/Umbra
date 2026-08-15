<script lang="ts">
import { Button, ButtonGroup } from "flowbite-svelte";
import { browser } from "$app/environment";
import { page } from "$app/state";
import { m } from "$lib/paraglide/messages.js";
import { getLocale, locales, localizeHref } from "$lib/paraglide/runtime";

const shortLabels: Record<string, string> = { en: "EN", de: "DE" };
const fullLabels: Record<string, string> = {
	en: m.localeEn(),
	de: m.localeDe(),
};

// Locale changes always go through a full page load, so this stays in sync.
const current = getLocale();

// Search params carry the selected location/date, but they are unavailable
// while prerendering, so they are only appended in the browser.
const target = $derived(
	browser ? `${page.url.pathname}${page.url.search}` : page.url.pathname,
);

const options = $derived(
	locales.map((locale) => ({
		locale,
		href: localizeHref(target, { locale }),
		short: shortLabels[locale] ?? locale.toUpperCase(),
		full: fullLabels[locale] ?? locale,
	})),
);
</script>

<ButtonGroup aria-label={m.languagesAria()}>
	{#each options as option (option.locale)}
		<Button
			href={option.href}
			color={option.locale === current ? "primary" : "alternative"}
			aria-current={option.locale === current ? "true" : undefined}
			title={option.full}
			data-sveltekit-reload
		>
			{option.short}
		</Button>
	{/each}
</ButtonGroup>
