<script lang="ts">
	import { onMount } from 'svelte';
	import { budgetDB } from '$lib/db.js';
	import type { StoredFile, AiUsageRecord } from '$lib/types.js';
	
	interface Props {
		files: StoredFile[];
	}
	
	let { files }: Props = $props();
	let allUsageRecords: AiUsageRecord[] = $state([]);
	
	onMount(async () => {
		await loadAllUsageRecords();
	});
	
	async function loadAllUsageRecords() {
		try {
			allUsageRecords = await budgetDB.getAllAiUsage();
		} catch (error) {
			console.error('Failed to load AI usage history:', error);
		}
	}
	
	function calculateTotalAiUsage() {
		if (allUsageRecords.length === 0) return null;
		
		let totalTokens = 0;
		let totalCost = 0;
		let operationCount = allUsageRecords.length;
		
		allUsageRecords.forEach(record => {
			totalTokens += record.usage.totalTokens;
			totalCost += record.usage.estimatedCost;
		});
		
		return { totalTokens, totalCost, operationCount };
	}
	
	let totalAiUsage = $derived(calculateTotalAiUsage());
	
	// Reload usage when files change (in case new processing happened)
	$effect(() => {
		if (files) {
			loadAllUsageRecords();
		}
	});
</script>

{#if totalAiUsage}
	<div class="text-right">
		<div class="text-xs text-muted-foreground font-medium">
			Uso Total de IA: {totalAiUsage.totalTokens.toLocaleString()} tokens • {totalAiUsage.totalCost.toFixed(4)} €
		</div>
		<div class="text-xs text-muted-foreground/70">
			{totalAiUsage.operationCount} operaciones
		</div>
	</div>
{/if}