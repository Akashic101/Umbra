<script lang="ts">
import { Button } from "flowbite-svelte";
import { LinkOutline } from "flowbite-svelte-icons";
import { page } from "$app/state";
import { toShareHref } from "$lib/env/tauri";
import { m } from "$lib/paraglide/messages.js";

let {
	size = "sm",
	class: className = "",
}: {
	size?: "xs" | "sm" | "md" | "lg" | "xl";
	class?: string;
} = $props();

let copied = $state(false);
let copiedTimer: ReturnType<typeof setTimeout> | undefined;

async function copyLink(): Promise<void> {
	const href = toShareHref(page.url);
	try {
		await navigator.clipboard.writeText(href);
	} catch {
		const input = document.createElement("input");
		input.value = href;
		document.body.appendChild(input);
		input.select();
		document.execCommand("copy");
		input.remove();
	}
	copied = true;
	clearTimeout(copiedTimer);
	copiedTimer = setTimeout(() => {
		copied = false;
	}, 1600);
}
</script>

<Button
	color={copied ? "green" : "alternative"}
	{size}
	class={className}
	onclick={copyLink}
	aria-label={copied ? m.linkCopiedAria() : m.copyLinkAria()}
>
	<LinkOutline class="h-4 w-4" />
	<span>{copied ? m.copied() : m.copyLink()}</span>
</Button>
