<script lang="ts">
import { Button, ButtonGroup } from "flowbite-svelte";
import { m } from "$lib/paraglide/messages.js";
import { getLocale, locales, setLocale } from "$lib/paraglide/runtime";

let { variant = "short" }: { variant?: "short" | "full" } = $props();

const shortLabels: Record<string, string> = { en: "EN", de: "DE" };
const current = $derived(getLocale());
const labels = $derived.by(() => {
	current;
	return variant === "full"
		? { en: m.localeEn(), de: m.localeDe() }
		: shortLabels;
});
</script>

<ButtonGroup aria-label={m.languagesAria()}>
	{#each locales as locale (locale)}
		<Button
			color={locale === current ? "primary" : "alternative"}
			aria-current={locale === current ? "true" : undefined}
			title={locale === "en" ? m.localeEn() : m.localeDe()}
			onclick={() => setLocale(locale)}
		>
			{labels[locale] ?? locale.toUpperCase()}
		</Button>
	{/each}
</ButtonGroup>
