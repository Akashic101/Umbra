<script lang="ts">
import "./layout.css";
import { goto } from "$app/navigation";
import favicon from "$lib/assets/favicon.svg";
import AppNav from "$lib/components/AppNav.svelte";
import { isTauri, pathFromDeepLink } from "$lib/env/tauri";
import { m } from "$lib/paraglide/messages.js";
import { getLocale, getTextDirection } from "$lib/paraglide/runtime";
import { applyTheme, readThemePreference } from "$lib/theme";

let { children } = $props();

// Prerendered HTML uses the base locale; correct lang/dir after the
// cookie, localStorage, or browser language is known.
$effect(() => {
	const locale = getLocale();
	document.documentElement.lang = locale;
	document.documentElement.dir = getTextDirection(locale);
});

$effect(() => {
	applyTheme(readThemePreference());
	const media = window.matchMedia("(prefers-color-scheme: dark)");
	const onChange = () => {
		if (readThemePreference() === "system") {
			applyTheme("system");
		}
	};
	media.addEventListener("change", onChange);
	return () => media.removeEventListener("change", onChange);
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
	<AppNav />
	<div class="min-h-0 flex-1">
		{@render children()}
	</div>
</div>
