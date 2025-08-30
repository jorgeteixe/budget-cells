<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { settings } from '$lib/stores.js';
	import { loadSettings } from '$lib/storage.js';
	import { FileText } from 'lucide-svelte';

	let { children } = $props();

	onMount(() => {
		settings.set(loadSettings());
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
	<title>Budget Cells - Professional Construction PDF Processor</title>
</svelte:head>

<div class="min-h-screen bg-background">
	<header class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
		<div class="container mx-auto flex h-16 items-center justify-between px-4">
			<div class="flex items-center space-x-2">
				<FileText class="h-6 w-6" />
				<span class="font-semibold">Budget Cells</span>
			</div>
			<nav class="flex items-center space-x-1">
				<a href="/" class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground h-9 px-3">
					Files
				</a>
				<a href="/settings" class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground h-9 px-3">
					Settings
				</a>
			</nav>
		</div>
	</header>
	
	<main class="container mx-auto py-6">
		{@render children?.()}
	</main>
</div>
