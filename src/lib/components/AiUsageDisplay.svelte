<script lang="ts">
	import type { AiUsage } from '$lib/types.js';
	
	interface Props {
		usage: AiUsage;
		variant?: 'inline' | 'compact' | 'detailed';
	}
	
	let { usage, variant = 'inline' }: Props = $props();
</script>

{#if variant === 'compact'}
	<span class="text-xs text-gray-400">
		{usage.totalTokens.toLocaleString()}t • {usage.estimatedCost.toFixed(4)}€
	</span>
{:else if variant === 'inline'}
	<span class="text-gray-500">
		{usage.totalTokens.toLocaleString()} tokens • {usage.estimatedCost.toFixed(4)} €
	</span>
{:else if variant === 'detailed'}
	<div class="text-xs text-gray-500 font-medium">
		Total AI Usage: {usage.totalTokens.toLocaleString()} tokens • {usage.estimatedCost.toFixed(4)} €
	</div>
{/if}