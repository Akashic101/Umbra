<script lang="ts">
import { Alert, Button } from "flowbite-svelte";
import { appState } from "$lib/app-state.svelte";
import { locationSettingsUrl, openLocationSettings } from "$lib/env/tauri";
import { m } from "$lib/paraglide/messages.js";

let { error }: { error: string | null } = $props();

const canOpenSettings = locationSettingsUrl() !== null;
</script>

{#if error}
	<Alert color="red" class="py-2 text-sm">
		<div class="flex flex-col items-start gap-2">
			<span>{error}</span>
			{#if appState.locationPermissionDenied && canOpenSettings}
				<Button
					size="xs"
					color="red"
					aria-label={m.openLocationSettingsAria()}
					onclick={() => void openLocationSettings()}
				>
					{m.openLocationSettings()}
				</Button>
			{/if}
		</div>
	</Alert>
{/if}
