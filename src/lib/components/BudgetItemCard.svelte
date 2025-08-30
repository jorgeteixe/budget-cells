<script lang="ts">
	import type { BudgetItem } from '$lib/types.js';
	import CopyButton from './CopyButton.svelte';
	
	interface Props {
		item: BudgetItem;
		itemIndex: number;
		isHighlighted?: boolean;
		onCopyChunk: (chunkIndex: number, text: string) => void;
		onCopyField: (field: 'unit' | 'quantity' | 'unitPrice' | 'total', text: string) => void;
	}
	
	let { item, itemIndex, isHighlighted = false, onCopyChunk, onCopyField }: Props = $props();
	
	function formatEuro(amount: number | undefined): string {
		if (!amount) return '0,00 €';
		return amount.toLocaleString('es-ES', { 
			style: 'currency', 
			currency: 'EUR',
			minimumFractionDigits: 2 
		});
	}
	
	function getTotalCopiedItems(): number {
		// Only count description chunks, not financial fields
		return item.copiedChunks.filter(Boolean).length;
	}
	
	function getTotalCopyableItems(): number {
		// Only count description chunks, not financial fields
		return item.chunks.length;
	}
</script>

{#if item.type === 'separator'}
	<div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
		<h3 class="text-lg font-semibold text-gray-800">
			{item.lineId ? `${item.lineId} - ` : ''}{item.description}
		</h3>
	</div>
{:else}
	<div
		id={`item-${itemIndex}`}
		class="bg-card border rounded-lg p-6 {isHighlighted ? 'ring-2 ring-primary' : ''}"
	>
		<div class="flex justify-between items-start mb-4">
			<div class="flex-1">
				<div class="flex items-center space-x-2">
					{#if item.lineId}
						<span class="text-sm font-mono bg-muted px-2 py-1 rounded">
							{item.lineId}
						</span>
					{/if}
				</div>
			</div>
			
			<div class="text-right">
				<div class="text-sm font-medium text-muted-foreground">
					{getTotalCopiedItems()}/{getTotalCopyableItems()} copied
				</div>
			</div>
		</div>
		
		<div class="space-y-4">
			<!-- Description chunks -->
			<div class="space-y-3">
				{#each item.chunks as chunk, chunkIndex}
					<div class="flex items-start space-x-3">
						<div class="flex-1">
							<div class="bg-muted/50 rounded-md p-3 text-sm {item.copiedChunks[chunkIndex] ? 'line-through decoration-muted-foreground/50' : ''}">
								{chunk}
							</div>
						</div>
						<CopyButton
							text={chunk}
							copied={item.copiedChunks[chunkIndex]}
							onclick={() => onCopyChunk(chunkIndex, chunk)}
						/>
					</div>
				{/each}
			</div>
			
			<!-- Financial data -->
			{#if item.quantity !== undefined || item.unit || item.unitPrice !== undefined || item.total !== undefined}
				<div class="border-t pt-4">
					<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
						{#if item.quantity !== undefined}
							<div class="flex flex-col space-y-1">
								<span class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cantidad</span>
								<button
									onclick={() => onCopyField('quantity', item.quantity!.toString())}
									class="bg-muted/50 hover:bg-muted px-3 py-2 rounded text-sm font-medium text-center transition-all duration-150 hover:scale-105 active:scale-95 cursor-copy"
								>
									{item.quantity}
								</button>
							</div>
						{/if}
						
						{#if item.unit}
							<div class="flex flex-col space-y-1">
								<span class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Unidad</span>
								<button
									onclick={() => onCopyField('unit', item.unit!)}
									class="bg-muted/50 hover:bg-muted px-3 py-2 rounded text-sm font-medium text-center transition-all duration-150 hover:scale-105 active:scale-95 cursor-copy"
								>
									{item.unit}
								</button>
							</div>
						{/if}
						
						{#if item.unitPrice !== undefined}
							<div class="flex flex-col space-y-1">
								<span class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Precio Unit.</span>
								<button
									onclick={() => onCopyField('unitPrice', formatEuro(item.unitPrice))}
									class="bg-muted/50 hover:bg-muted px-3 py-2 rounded text-sm font-medium text-center transition-all duration-150 hover:scale-105 active:scale-95 cursor-copy"
								>
									{formatEuro(item.unitPrice)}
								</button>
							</div>
						{/if}
						
						{#if item.total !== undefined}
							<div class="flex flex-col space-y-1">
								<span class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total</span>
								<button
									onclick={() => onCopyField('total', formatEuro(item.total))}
									class="bg-muted/50 hover:bg-muted px-3 py-2 rounded text-sm font-medium text-center transition-all duration-150 hover:scale-105 active:scale-95 font-semibold cursor-copy"
								>
									{formatEuro(item.total)}
								</button>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}