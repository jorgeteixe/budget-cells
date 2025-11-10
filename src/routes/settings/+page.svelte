<script lang="ts">
	import { onMount } from 'svelte';
	import { settings } from '$lib/stores.js';
	import { saveSettings } from '$lib/storage.js';
	import { budgetDB } from '$lib/db.js';
	import { fetchAvailableModels, type GeminiModel } from '$lib/gemini.js';
	import Button from '$lib/components/Button.svelte';
	import { Trash2, RefreshCw } from 'lucide-svelte';

	// Fallback models list in case API call fails
	const FALLBACK_MODELS: GeminiModel[] = [
		{ name: 'gemini-1.5-flash', displayName: 'Gemini 1.5 Flash' },
		{ name: 'gemini-1.5-flash-8b', displayName: 'Gemini 1.5 Flash-8B' },
		{ name: 'gemini-1.5-pro', displayName: 'Gemini 1.5 Pro' },
		{ name: 'gemini-2.0-flash-exp', displayName: 'Gemini 2.0 Flash (Experimental)' }
	];

	let apiKey = '';
	let geminiModel = 'gemini-1.5-flash';
	let maxChunkLength = 256;
	let tokenCostPer1k = 0.00015;
	let showSaved = false;
	let showCleared = false;
	let availableModels: GeminiModel[] = FALLBACK_MODELS;
	let loadingModels = false;
	let modelsError = '';

	settings.subscribe(value => {
		apiKey = value.geminiApiKey;
		geminiModel = value.geminiModel;
		maxChunkLength = value.maxChunkLength;
		tokenCostPer1k = value.tokenCostPer1k;
	});

	onMount(() => {
		// Try to fetch models if API key is available
		if (apiKey) {
			loadModels();
		}
	});

	// Watch for API key changes and reload models
	let previousApiKey = apiKey;
	$: if (apiKey && apiKey !== previousApiKey && apiKey.length > 10) {
		previousApiKey = apiKey;
		loadModels();
	}

	async function loadModels() {
		if (!apiKey) {
			modelsError = 'Se requiere clave API para cargar modelos';
			return;
		}

		loadingModels = true;
		modelsError = '';

		try {
			availableModels = await fetchAvailableModels(apiKey);

			// Ensure current model is in the list, if not, add it
			if (!availableModels.find(m => m.name === geminiModel)) {
				availableModels = [
					...availableModels,
					{ name: geminiModel, displayName: geminiModel }
				];
			}
		} catch (error) {
			console.error('Failed to load models:', error);
			modelsError = error instanceof Error ? error.message : 'Error al cargar modelos';
			availableModels = FALLBACK_MODELS;
		} finally {
			loadingModels = false;
		}
	}
	
	function handleSave() {
		const newSettings = {
			geminiApiKey: apiKey,
			geminiModel,
			maxChunkLength,
			tokenCostPer1k
		};
		settings.set(newSettings);
		saveSettings(newSettings);
		showSaved = true;
		setTimeout(() => showSaved = false, 2000);
	}
	
	async function handleClearUsageHistory() {
		if (!confirm('Esto eliminará permanentemente todo su historial de uso de IA. ¿Está seguro?')) {
			return;
		}
		
		try {
			await budgetDB.clearAllAiUsage();
			showCleared = true;
			setTimeout(() => showCleared = false, 3000);
		} catch (error) {
			console.error('Failed to clear usage history:', error);
			alert('Error al borrar el historial de uso');
		}
	}
</script>

<div class="max-w-2xl">
	<h2 class="text-2xl font-bold text-foreground mb-6">Configuración</h2>
	
	<div class="bg-card border rounded-lg p-6">
		<div class="space-y-6">
			<div>
				<label for="apiKey" class="block text-sm font-medium text-foreground">
					Clave API de Gemini
				</label>
				<input
					id="apiKey"
					type="password"
					bind:value={apiKey}
					class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					placeholder="Ingrese su clave API de Gemini"
				/>
				<p class="mt-2 text-sm text-muted-foreground">
					Obtenga su clave API desde <a href="https://makersuite.google.com/app/apikey" target="_blank" class="text-primary hover:text-primary/80">Google AI Studio</a>
				</p>
			</div>

			<div>
				<div class="flex items-center justify-between mb-1">
					<label for="geminiModel" class="block text-sm font-medium text-foreground">
						Modelo de Gemini
					</label>
					<Button
						variant="ghost"
						size="sm"
						onclick={loadModels}
						disabled={!apiKey || loadingModels}
						class="h-6 px-2"
					>
						<RefreshCw class="w-3 h-3 {loadingModels ? 'animate-spin' : ''}" />
					</Button>
				</div>
				<select
					id="geminiModel"
					bind:value={geminiModel}
					disabled={loadingModels}
					class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
				>
					{#each availableModels as model (model.name)}
						<option value={model.name}>{model.displayName}</option>
					{/each}
				</select>
				{#if loadingModels}
					<p class="mt-2 text-sm text-blue-600">
						Cargando modelos disponibles...
					</p>
				{:else if modelsError}
					<p class="mt-2 text-sm text-orange-600">
						⚠️ {modelsError} - Mostrando modelos predeterminados
					</p>
				{:else}
					<p class="mt-2 text-sm text-muted-foreground">
						Seleccione el modelo de IA a utilizar para procesar PDFs. Si experimenta errores, intente con un modelo diferente.
					</p>
				{/if}
			</div>

			<div>
				<label for="maxChunkLength" class="block text-sm font-medium text-foreground">
					Longitud Máxima de Fragmento
				</label>
				<input
					id="maxChunkLength"
					type="number"
					bind:value={maxChunkLength}
					min="50"
					max="1000"
					class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				/>
				<p class="mt-2 text-sm text-muted-foreground">
					Máximo de caracteres por fragmento de descripción (predeterminado: 256)
				</p>
			</div>
			
			<div>
				<label for="tokenCostPer1k" class="block text-sm font-medium text-foreground">
					Costo por 1000 Tokens (EUR)
				</label>
				<input
					id="tokenCostPer1k"
					type="number"
					bind:value={tokenCostPer1k}
					min="0"
					step="0.00001"
					class="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				/>
				<p class="mt-2 text-sm text-muted-foreground">
					Costo por 1000 tokens para el cálculo de uso de IA (predeterminado: 0.00015 EUR para Gemini 1.5 Flash)
				</p>
			</div>
			
			<div class="border-t pt-6">
				<h3 class="text-lg font-medium text-foreground mb-4">Historial de Uso de IA</h3>
				<p class="text-sm text-muted-foreground mb-4">
					Su uso de IA se rastrea permanentemente para darle una contabilidad precisa de costos, incluso para archivos eliminados o reprocesados.
				</p>
				
				<div class="flex items-center justify-between">
					<div>
						<p class="font-medium text-destructive mb-1">Borrar Todo el Historial de Uso</p>
						<p class="text-sm text-muted-foreground">Eliminar permanentemente todos los registros de uso de IA y datos de costo</p>
					</div>
					<Button variant="outline" onclick={handleClearUsageHistory} class="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
						<Trash2 class="w-4 h-4 mr-2" />
						Borrar Historial
					</Button>
				</div>
				
				{#if showCleared}
					<div class="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
						<div class="text-green-800 text-sm font-medium">✅ ¡Historial de uso borrado exitosamente!</div>
					</div>
				{/if}
			</div>
			
			<div class="flex items-center justify-between pt-6">
				<Button onclick={handleSave}>
					Guardar Configuración
				</Button>
				
				{#if showSaved}
					<div class="px-3 py-2 bg-green-50 border border-green-200 rounded-md">
						<span class="text-green-800 text-sm font-medium">✅ ¡Configuración guardada!</span>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>