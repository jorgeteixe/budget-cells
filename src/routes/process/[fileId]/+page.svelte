<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { settings, processingState, currentScrollIndex } from '$lib/stores.js';
	import { budgetDB } from '$lib/db.js';
	import { extractTextFromPDF } from '$lib/pdf-processor.js';
	import { processWithGemini } from '$lib/gemini.js';
	import type { StoredFile, FileWithBudgetData, BudgetItem, AiUsageRecord } from '$lib/types.js';
	import ProcessingStatus from '$lib/components/ProcessingStatus.svelte';
	import BudgetItemCard from '$lib/components/BudgetItemCard.svelte';
	import AiUsageDisplay from '$lib/components/AiUsageDisplay.svelte';
	import ConfirmationModal from '$lib/components/ConfirmationModal.svelte';
	import Button from '$lib/components/Button.svelte';
	import { ChevronLeft, RefreshCw, Play } from 'lucide-svelte';
	
	let file = $state<FileWithBudgetData | null>(null);
	let scrollContainer = $state<HTMLDivElement>();
	let processingStatus = $state('');
	let showReprocessModal = $state(false);
	
	let settingsValue = $derived($settings);
	let processingStateValue = $derived($processingState);
	let scrollIndex = $derived($currentScrollIndex);
	let fileId = $derived($page.params.fileId);
	
	onMount(async () => {
		await loadFile();
	});
	
	async function loadFile() {
		if (!fileId) return;
		
		try {
			const storedFile = await budgetDB.getFile(fileId);
			if (!storedFile) {
				goto('/');
				return;
			}
			
			// Load budget data separately
			const budgetData = await budgetDB.getBudgetData(fileId);
			file = { ...storedFile, budgetData };
		} catch (error) {
			console.error('Failed to load file:', error);
			goto('/');
		}
	}
	
	async function processFile() {
		if (!file || !settingsValue.geminiApiKey) return;
		
		processingState.update(s => ({ ...s, isProcessing: true, error: null, selectedFileId: file!.id }));
		processingStatus = 'Starting PDF processing...';
		
		try {
			const text = await extractTextFromPDF(file.file, (status) => {
				processingStatus = status;
			});
			
			const budgetData = await processWithGemini(text, settingsValue.geminiApiKey, settingsValue.maxChunkLength, settingsValue.tokenCostPer1k, (status) => {
				processingStatus = status;
			});
			
			// Track AI usage in history (persists even if file is deleted)
			if (budgetData.aiUsage) {
				const isReprocess = file.budgetData !== undefined;
				const usageRecord: AiUsageRecord = {
					id: crypto.randomUUID(),
					fileId: file.id,
					fileName: file.name,
					operation: isReprocess ? 'reprocess' : 'process',
					timestamp: new Date().toISOString(),
					usage: budgetData.aiUsage,
					tokenCostPer1k: settingsValue.tokenCostPer1k
				};
				
				await budgetDB.saveAiUsage(usageRecord);
			}
			
			// Save budget data separately
			await budgetDB.saveBudgetData(file.id, budgetData);
			
			// Update local state
			file.budgetData = budgetData;
			
			processingState.update(s => ({ 
				...s, 
				isProcessing: false 
			}));
			
			currentScrollIndex.set(0);
			setTimeout(scrollToNextUncompleted, 100);
			
		} catch (error) {
			processingStatus = '';
			processingState.update(s => ({ 
				...s, 
				isProcessing: false, 
				error: `Processing failed: ${error}` 
			}));
		}
	}
	
	async function handleCopyChunk(itemId: string, chunkIndex: number, text: string) {
		try {
			await navigator.clipboard.writeText(text);
			
			if (!file?.budgetData) return;
			
			const itemIndex = file.budgetData.items.findIndex(item => item.id === itemId);
			if (itemIndex === -1) return;
			
			file.budgetData.items[itemIndex].copiedChunks[chunkIndex] = true;
			// Trigger Svelte reactivity by reassigning the file object
			file = { ...file, budgetData: { ...file.budgetData } };
			
			// Create a clean copy to avoid DataCloneError
			const cleanBudgetData = JSON.parse(JSON.stringify(file.budgetData));
			await budgetDB.saveBudgetData(file.id, cleanBudgetData);
			setTimeout(scrollToNextUncompleted, 200);
		} catch (error) {
			console.error('Failed to copy text:', error);
		}
	}
	
	async function handleCopyField(itemId: string, field: 'unit' | 'quantity' | 'unitPrice' | 'total', text: string) {
		try {
			await navigator.clipboard.writeText(text);
			
			if (!file?.budgetData) return;
			
			const itemIndex = file.budgetData.items.findIndex(item => item.id === itemId);
			if (itemIndex === -1) return;
			
			if (field === 'unit') {
				file.budgetData.items[itemIndex].copiedUnit = true;
			} else if (field === 'quantity') {
				file.budgetData.items[itemIndex].copiedQuantity = true;
			} else if (field === 'unitPrice') {
				file.budgetData.items[itemIndex].copiedUnitPrice = true;
			} else if (field === 'total') {
				file.budgetData.items[itemIndex].copiedTotal = true;
			}
			
			// Create a clean copy to avoid DataCloneError
			const cleanBudgetData = JSON.parse(JSON.stringify(file.budgetData));
			await budgetDB.saveBudgetData(file.id, cleanBudgetData);
			setTimeout(scrollToNextUncompleted, 200);
		} catch (error) {
			console.error('Failed to copy text:', error);
		}
	}
	
	function scrollToNextUncompleted() {
		if (!file?.budgetData || !scrollContainer) return;
		
		for (let i = 0; i < file.budgetData.items.length; i++) {
			const item = file.budgetData.items[i];
			// Only consider description chunks for auto-scroll, ignore financial fields
			const hasUncopiedChunks = item.copiedChunks.some(copied => !copied);
			
			if (hasUncopiedChunks) {
				const element = document.getElementById(`item-${i}`);
				if (element) {
					element.scrollIntoView({ behavior: 'smooth', block: 'center' });
					currentScrollIndex.set(i);
				}
				break;
			}
		}
	}
	
	function getTotalProgress() {
		if (!file?.budgetData) return { completed: 0, total: 0 };
		
		let completed = 0;
		let total = 0;
		
		file.budgetData.items.forEach(item => {
			if (item.type === 'line') {
				// Description chunks
				total += item.chunks.length;
				completed += item.copiedChunks.filter(Boolean).length;
				
				// Unit
				if (item.unit) {
					total += 1;
					if (item.copiedUnit) completed += 1;
				}
				
				// Quantity
				if (item.quantity !== undefined) {
					total += 1;
					if (item.copiedQuantity) completed += 1;
				}
				
				// Unit Price
				if (item.unitPrice !== undefined) {
					total += 1;
					if (item.copiedUnitPrice) completed += 1;
				}
				
				// Total
				if (item.total !== undefined) {
					total += 1;
					if (item.copiedTotal) completed += 1;
				}
			}
		});
		
		return { completed, total };
	}
	
	function handleReprocessClick() {
		showReprocessModal = true;
	}
	
	function handleReprocessConfirm() {
		showReprocessModal = false;
		processFile();
	}
	
	function handleReprocessCancel() {
		showReprocessModal = false;
	}
	
	function calculateProgress() {
		if (!file?.budgetData?.items) {
			return { completed: 0, total: 0 };
		}
		
		let completed = 0;
		let total = 0;
		
		for (const item of file.budgetData.items) {
			if (item.type === 'line' && item.chunks && item.copiedChunks) {
				total += item.chunks.length;
				completed += item.copiedChunks.filter(Boolean).length;
			}
		}
		
		return { completed, total };
	}
</script>

<div class="space-y-6">
	{#if file}
		<div class="bg-card border rounded-lg p-6">
			<div class="flex items-center justify-between mb-6">
				<div>
					<h2 class="text-2xl font-bold text-foreground">{file.name}</h2>
					<div class="text-sm text-muted-foreground mt-1">
						{file.budgetData ? `Procesado ${new Date(file.budgetData.processedAt).toLocaleString()}` : 'Aún no procesado'}
					</div>
				</div>
				
				<div class="flex items-center justify-between">
					<Button variant="ghost" size="sm" onclick={() => goto('/')}>
						<ChevronLeft class="w-4 h-4 mr-1" />
						Volver a Archivos
					</Button>
					
					{#if !processingStateValue.isProcessing}
						<Button 
							variant="outline"
							onclick={file.budgetData ? handleReprocessClick : processFile}
							disabled={!settingsValue.geminiApiKey}
						>
							{#if file.budgetData}
								<RefreshCw class="w-4 h-4 mr-2" />
								Reprocesar PDF
							{:else}
								<Play class="w-4 h-4 mr-2" />
								Procesar PDF
							{/if}
						</Button>
					{/if}
				</div>
			</div>
			
			{#if !settingsValue.geminiApiKey}
				<div class="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
					<div class="text-sm text-yellow-700">
						⚠️ Por favor configure su clave API de Gemini en <a href="/settings" class="font-medium underline hover:text-yellow-600">Configuración</a> primero.
					</div>
				</div>
			{/if}
			
			<ProcessingStatus isProcessing={processingStateValue.isProcessing} status={processingStatus} error={processingStateValue.error} />
			
			{#if file.budgetData && !processingStateValue.isProcessing}
				<div class="grid gap-4 md:grid-cols-3">
					<!-- Processing Status -->
					<div class="bg-green-50 border border-green-200 rounded-lg p-4">
						<div class="text-sm font-medium text-green-800">
							✅ Procesamiento Completo
						</div>
						<div class="text-lg font-semibold text-green-900 mt-1">
							{file.budgetData.items.length} elementos extraídos
						</div>
					</div>
					
					<!-- Progress Tracking -->
					{#if file.budgetData}
						{@const progressValue = calculateProgress()}
						<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
							<div class="text-sm font-medium text-blue-800">
								Progreso de Copiado
							</div>
							<div class="text-lg font-semibold text-blue-900 mt-1">
								{progressValue.completed}/{progressValue.total} copiados
							</div>
						</div>
					{/if}
					
					<!-- AI Usage Cost -->
					{#if file.budgetData.aiUsage}
						<div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
							<div class="text-sm font-medium text-orange-800">
								Costo de Procesamiento
							</div>
							<div class="text-lg font-semibold text-orange-900 mt-1">
								{file.budgetData.aiUsage.estimatedCost.toFixed(4)} € ({file.budgetData.aiUsage.totalTokens.toLocaleString()}t)
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
		
		{#if file.budgetData && !processingStateValue.isProcessing}
			<div bind:this={scrollContainer} class="space-y-4">
				{#each file.budgetData.items as item, itemIndex (item.id)}
					<BudgetItemCard 
						{item} 
						{itemIndex}
						isHighlighted={scrollIndex === itemIndex}
						onCopyChunk={(chunkIndex, text) => handleCopyChunk(item.id, chunkIndex, text)}
						onCopyField={(field, text) => handleCopyField(item.id, field, text)}
					/>
				{/each}
			</div>
		{/if}
	{:else}
		<div class="text-center py-12">
			<p class="text-muted-foreground">Cargando archivo...</p>
		</div>
	{/if}
</div>

<ConfirmationModal
	isOpen={showReprocessModal}
	title="Reprocesar Archivo"
	message="¿Está seguro que desea reprocesar este archivo? Esto sobrescribirá los datos existentes e incurrirá en costos adicionales de IA."
	confirmText="Reprocesar"
	cancelText="Cancelar"
	variant="warning"
	onConfirm={handleReprocessConfirm}
	onCancel={handleReprocessCancel}
/>