<script lang="ts">
import { Badge, Button, ButtonGroup } from "flowbite-svelte";
import { CloseOutline } from "flowbite-svelte-icons";
import { onMount } from "svelte";
import { appState } from "$lib/app-state.svelte";
import GpsErrorAlert from "$lib/components/GpsErrorAlert.svelte";
import LocaleSwitcher from "$lib/components/LocaleSwitcher.svelte";
import { favoriteDetailsHref } from "$lib/services/favorites";
import { formatIsoDate } from "$lib/eclipse/time";
import { locationSettingsUrl, openLocationSettings } from "$lib/env/tauri";
import { m } from "$lib/paraglide/messages.js";
import { getLocale } from "$lib/paraglide/runtime";
import { formatCoordinates } from "$lib/services/geocoding";
import {
	getLocationPermissionState,
	type LocationPermissionState,
} from "$lib/services/location-permission";
import {
	readThemePreference,
	setTheme,
	type ThemePreference,
} from "$lib/theme";
import type { DistanceUnit, TemperatureUnit } from "$lib/units";
import { unitsState } from "$lib/units-state.svelte";

const themes: ThemePreference[] = ["light", "dark", "system"];
const distanceUnits: DistanceUnit[] = ["metric", "imperial"];
const temperatureUnits: TemperatureUnit[] = ["celsius", "fahrenheit"];
const canOpenSettings = locationSettingsUrl() !== null;
const locale = $derived(getLocale());

let permission = $state<LocationPermissionState>("prompt");
let requesting = $state(false);
let theme = $state<ThemePreference>(readThemePreference());
let distanceUnit = $state<DistanceUnit>(unitsState.distance);
let temperatureUnit = $state<TemperatureUnit>(unitsState.temperature);

const permissionLabel = $derived(
	permission === "granted"
		? m.settingsLocationStatusGranted()
		: permission === "denied"
			? m.settingsLocationStatusDenied()
			: m.settingsLocationStatusPrompt(),
);

const permissionColor = $derived(
	permission === "granted"
		? "green"
		: permission === "denied"
			? "red"
			: "yellow",
);

const themeLabels = $derived.by(() => {
	locale;
	return {
		light: m.settingsThemeLight(),
		dark: m.settingsThemeDark(),
		system: m.settingsThemeSystem(),
	};
});

const distanceLabels = $derived.by(() => {
	locale;
	return {
		metric: m.settingsDistanceMetric(),
		imperial: m.settingsDistanceImperial(),
	};
});

const temperatureLabels = $derived.by(() => {
	locale;
	return {
		celsius: m.settingsTemperatureCelsius(),
		fahrenheit: m.settingsTemperatureFahrenheit(),
	};
});

async function refreshPermission(): Promise<void> {
	permission = await getLocationPermissionState();
}

async function allowLocation(): Promise<void> {
	requesting = true;
	try {
		await appState.useGps({ openSettingsOnFail: false });
		await refreshPermission();
	} finally {
		requesting = false;
	}
}

function chooseTheme(next: ThemePreference): void {
	theme = next;
	setTheme(next);
}

function chooseDistance(next: DistanceUnit): void {
	distanceUnit = next;
	unitsState.setDistance(next);
}

function chooseTemperature(next: TemperatureUnit): void {
	temperatureUnit = next;
	unitsState.setTemperature(next);
}

function favoriteHref(favorite: (typeof appState.favorites)[number]): string {
	return favoriteDetailsHref(favorite);
}

function kindLabel(kind: (typeof appState.favorites)[number]["kind"]): string {
	return kind === "lunar" ? m.navLunar() : m.navSolar();
}

function placeLabel(
	location: (typeof appState.favorites)[number]["location"],
): string {
	return location.label || formatCoordinates(location.lat, location.lon);
}

function clearFavorites(): void {
	if (!window.confirm(m.settingsFavoritesClearConfirm())) {
		return;
	}
	appState.clearFavorites();
}

onMount(() => {
	void refreshPermission();
});
</script>

<svelte:window onfocus={() => void refreshPermission()} />

<svelte:head>
	<title>{m.settingsTitle()} — {m.brandName()}</title>
	<meta name="description" content={m.settingsLead()}>
</svelte:head>

<div
	class="mx-auto flex h-full w-full max-w-3xl flex-col gap-8 overflow-y-auto px-4 pb-10 pt-4 sm:px-6"
>
	<header>
		<p class="text-xs text-gray-500 dark:text-gray-400">
			{m.settingsEyebrow()}
		</p>
		<h1 class="text-xl font-semibold text-gray-900 dark:text-white">
			{m.settingsTitle()}
		</h1>
		<p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
			{m.settingsLead()}
		</p>
	</header>

	<section class="space-y-3" aria-labelledby="settings-location">
		<h2
			id="settings-location"
			class="text-lg font-semibold text-gray-900 dark:text-white"
		>
			{m.settingsLocationHeading()}
		</h2>
		<p class="text-sm text-gray-600 dark:text-gray-300">
			{m.settingsLocationHint()}
		</p>
		<div class="flex flex-wrap items-center gap-2">
			<Badge color={permissionColor}>{permissionLabel}</Badge>
			{#if permission !== "denied"}
				<Button
					size="sm"
					color="primary"
					disabled={requesting}
					aria-label={m.settingsLocationAllowAria()}
					onclick={() => void allowLocation()}
				>
					{permission === "granted"
						? m.settingsLocationUseGps()
						: m.settingsLocationAllow()}
				</Button>
			{/if}
			{#if canOpenSettings}
				<Button
					size="sm"
					color="alternative"
					aria-label={m.openLocationSettingsAria()}
					onclick={() => void openLocationSettings()}
				>
					{m.openLocationSettings()}
				</Button>
			{/if}
		</div>
		{#if permission === "denied" && !canOpenSettings}
			<p class="text-sm text-gray-600 dark:text-gray-300">
				{m.settingsLocationWebDenied()}
			</p>
		{/if}
		<GpsErrorAlert error={appState.error} />
	</section>

	<section class="space-y-3" aria-labelledby="settings-language">
		<h2
			id="settings-language"
			class="text-lg font-semibold text-gray-900 dark:text-white"
		>
			{m.settingsLanguageHeading()}
		</h2>
		<p class="text-sm text-gray-600 dark:text-gray-300">
			{m.settingsLanguageHint()}
		</p>
		<LocaleSwitcher variant="full" />
	</section>

	<section class="space-y-3" aria-labelledby="settings-theme">
		<h2
			id="settings-theme"
			class="text-lg font-semibold text-gray-900 dark:text-white"
		>
			{m.settingsThemeHeading()}
		</h2>
		<p class="text-sm text-gray-600 dark:text-gray-300">
			{m.settingsThemeHint()}
		</p>
		<ButtonGroup aria-label={m.settingsThemeAria()}>
			{#each themes as value (value)}
				<Button
					color={theme === value ? "primary" : "alternative"}
					aria-current={theme === value ? "true" : undefined}
					onclick={() => chooseTheme(value)}
				>
					{themeLabels[value]}
				</Button>
			{/each}
		</ButtonGroup>
	</section>

	<section class="space-y-4" aria-labelledby="settings-units">
		<div class="space-y-2">
			<h2
				id="settings-units"
				class="text-lg font-semibold text-gray-900 dark:text-white"
			>
				{m.settingsUnitsHeading()}
			</h2>
			<p class="text-sm text-gray-600 dark:text-gray-300">
				{m.settingsUnitsHint()}
			</p>
		</div>

		<div class="space-y-2">
			<h3 class="text-sm font-medium text-gray-900 dark:text-white">
				{m.settingsDistanceHeading()}
			</h3>
			<p class="text-sm text-gray-600 dark:text-gray-300">
				{m.settingsDistanceHint()}
			</p>
			<ButtonGroup aria-label={m.settingsDistanceAria()}>
				{#each distanceUnits as value (value)}
					<Button
						color={distanceUnit === value ? "primary" : "alternative"}
						aria-current={distanceUnit === value ? "true" : undefined}
						onclick={() => chooseDistance(value)}
					>
						{distanceLabels[value]}
					</Button>
				{/each}
			</ButtonGroup>
		</div>

		<div class="space-y-2">
			<h3 class="text-sm font-medium text-gray-900 dark:text-white">
				{m.settingsTemperatureHeading()}
			</h3>
			<p class="text-sm text-gray-600 dark:text-gray-300">
				{m.settingsTemperatureHint()}
			</p>
			<ButtonGroup aria-label={m.settingsTemperatureAria()}>
				{#each temperatureUnits as value (value)}
					<Button
						color={temperatureUnit === value ? "primary" : "alternative"}
						aria-current={temperatureUnit === value ? "true" : undefined}
						onclick={() => chooseTemperature(value)}
					>
						{temperatureLabels[value]}
					</Button>
				{/each}
			</ButtonGroup>
		</div>
	</section>

	<section class="space-y-3" aria-labelledby="settings-favorites">
		<div class="flex items-center justify-between gap-3">
			<h2
				id="settings-favorites"
				class="text-lg font-semibold text-gray-900 dark:text-white"
			>
				{m.settingsFavoritesHeading()}
			</h2>
			{#if appState.favorites.length}
				<Button
					size="xs"
					color="alternative"
					aria-label={m.settingsFavoritesClearAria()}
					onclick={clearFavorites}
				>
					{m.settingsFavoritesClear()}
				</Button>
			{/if}
		</div>
		<p class="text-sm text-gray-600 dark:text-gray-300">
			{m.settingsFavoritesHint()}
		</p>
		{#if appState.sortedFavorites.length === 0}
			<p class="text-sm text-gray-500 dark:text-gray-400">
				{m.favoritesEmpty()}
			</p>
		{:else}
			<ul class="divide-y divide-gray-200 dark:divide-gray-700">
				{#each appState.sortedFavorites as fav (fav.id)}
					<li class="flex items-start gap-3 py-3">
						<div class="min-w-0 flex-1">
							<p class="font-medium text-gray-900 dark:text-white">
								{formatIsoDate(fav.date)}
							</p>
							<p
								class="truncate text-sm text-gray-500 dark:text-gray-400"
								title={placeLabel(fav.location)}
							>
								{kindLabel(fav.kind)} · {placeLabel(fav.location)}
							</p>
						</div>
						<a
							href={favoriteHref(fav)}
							class="shrink-0 text-sm font-medium text-primary-700 hover:underline dark:text-primary-300"
						>
							{m.settingsFavoritesOpen()}
						</a>
						<button
							type="button"
							class="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
							aria-label={m.removeFavoriteAria()}
							onclick={() => appState.removeFavorite(fav.id)}
						>
							<CloseOutline class="h-4 w-4" />
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
