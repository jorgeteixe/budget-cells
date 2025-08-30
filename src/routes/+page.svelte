<script lang="ts">
	import { onMount } from 'svelte';
	import { settings, storedFiles, selectedFile } from '$lib/stores.js';
	import { budgetDB } from '$lib/db.js';
	import type { FileWithBudgetData } from '$lib/types.js';
	import { goto } from '$app/navigation';
	import { FileText } from 'lucide-svelte';
	import FileUpload from '$lib/components/FileUpload.svelte';
	import FileCard from '$lib/components/FileCard.svelte';
	import AiUsageSummary from '$lib/components/AiUsageSummary.svelte';
	
	$: settingsValue = $settings;
	$: files = $storedFiles;
	
	onMount(async () => {
		await loadFiles();
	});
	
	async function loadFiles() {
		try {
			const files = await budgetDB.getFiles();
			
			// Load budget data for each file
			const filesWithBudgetData: FileWithBudgetData[] = await Promise.all(
				files.map(async (file) => {
					const budgetData = await budgetDB.getBudgetData(file.id);
					return { ...file, budgetData };
				})
			);
			
			storedFiles.set(filesWithBudgetData.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()));
		} catch (error) {
			console.error('Failed to load files:', error);
		}
	}
	
	async function handleFileUpload(file: File) {
		try {
			await budgetDB.saveFile(file);
			await loadFiles();
		} catch (error) {
			console.error('Failed to save file:', error);
			alert('Error al guardar archivo');
		}
	}
	
	async function handleSelectFile(file: FileWithBudgetData) {
		selectedFile.set(file);
		goto(`/process/${file.id}`);
	}
	
	async function handleDeleteFile(file: FileWithBudgetData) {
		try {
			await budgetDB.deleteFile(file.id);
			// Also delete associated budget data
			await budgetDB.deleteBudgetData(file.id);
			await loadFiles();
		} catch (error) {
			console.error('Failed to delete file:', error);
		}
	}
</script>

<div class="space-y-6">
	<div class="bg-card border rounded-lg">
		<div class="flex items-center justify-between p-6 border-b">
			<h2 class="text-2xl font-bold text-foreground">Archivos de Presupuesto</h2>
			<AiUsageSummary {files} />
		</div>
		
		<div class="p-6">
			{#if !settingsValue.geminiApiKey}
				<div class="bg-orange-50 border border-orange-200 rounded-md p-4 mb-6">
					<div class="flex">
						<div class="text-sm text-orange-700">
							⚠️ Por favor configure su clave API de Gemini en <a href="/settings" class="font-medium underline hover:text-orange-600">Configuración</a> primero.
						</div>
					</div>
				</div>
			{/if}
			
			{#if files.length === 0}
				<!-- Hero Upload Section for Empty State -->
				<div class="text-center py-12 border-2 border-dashed border-muted-foreground/20 rounded-lg bg-muted/10">
					<FileText class="mx-auto h-16 w-16 text-primary mb-4" />
					<h3 class="text-xl font-semibold text-foreground mb-2">Sube tu Primer PDF de Presupuesto</h3>
					<p class="text-muted-foreground mb-6 max-w-md mx-auto">Comienza subiendo un PDF de presupuesto de construcción. Nuestra IA extraerá todos los elementos y los hará fáciles de copiar.</p>
					<div class="max-w-sm mx-auto">
						<FileUpload onFileSelected={handleFileUpload} />
					</div>
				</div>
			{:else}
				<!-- Compact Upload for When Files Exist -->
				<div class="mb-6">
					<FileUpload onFileSelected={handleFileUpload} />
				</div>
			{/if}
		</div>
	</div>
	
	{#if files.length > 0}
		<div class="grid gap-4">
			{#each files as file (file.id)}
				<FileCard {file} onSelect={handleSelectFile} onDelete={handleDeleteFile} />
			{/each}
		</div>
	{/if}
</div>
