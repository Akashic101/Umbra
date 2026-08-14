<script lang="ts">
import "./layout.css";
import { DarkMode, NavBrand, Navbar } from "flowbite-svelte";
import favicon from "$lib/assets/favicon.svg";

let { children } = $props();
</script>

<svelte:head>
	<title>Umbra — Solar eclipse local circumstances</title>
	<meta
		name="description"
		content="Start, end, and coverage for any solar eclipse at any place on Earth."
	>
	<link rel="icon" href={favicon}>
</svelte:head>

<div class="flex h-[100dvh] flex-col overflow-hidden">
	<Navbar fluid class="border-b border-gray-200 dark:border-gray-700">
		<NavBrand href="/">
			<img src={favicon} alt="" class="me-2 h-6 w-6">
			<span class="text-lg font-semibold">Umbra</span>
		</NavBrand>
		<DarkMode />
	</Navbar>
	<div class="min-h-0 flex-1">
		{@render children()}
	</div>
</div>
