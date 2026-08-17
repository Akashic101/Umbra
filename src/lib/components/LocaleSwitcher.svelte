<script lang="ts">
import { Button, ButtonGroup } from "flowbite-svelte";
import { m } from "$lib/paraglide/messages.js";
import { getLocale, locales, setLocale } from "$lib/paraglide/runtime";

const shortLabels: Record<string, string> = { en: "EN", de: "DE" };
const fullLabels: Record<string, string> = {
	en: m.localeEn(),
	de: m.localeDe(),
};

const current = getLocale();
</script>

<ButtonGroup aria-label={m.languagesAria()}>
	{#each locales as locale (locale)}
		<Button
			color={locale === current ? "primary" : "alternative"}
			aria-current={locale === current ? "true" : undefined}
			title={fullLabels[locale] ?? locale}
			onclick={() => setLocale(locale)}
		>
			{shortLabels[locale] ?? locale.toUpperCase()}
		</Button>
	{/each}
</ButtonGroup>
