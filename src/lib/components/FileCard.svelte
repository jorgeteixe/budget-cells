<script lang="ts">
	import type { FileWithBudgetData } from '$lib/types.js';
	import AiUsageDisplay from './AiUsageDisplay.svelte';
	import ConfirmationModal from './ConfirmationModal.svelte';
	import Button from './Button.svelte';
	import { FileText, Eye, Play, Trash2, CheckCircle, Clock } from 'lucide-svelte';
	
	interface Props {
		file: FileWithBudgetData;
		onSelect: (file: FileWithBudgetData) => void;
		onDelete: (file: FileWithBudgetData) => void;
	}
	
	let { file, onSelect, onDelete }: Props = $props();
	let showDeleteModal = $state(false);
	
	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
		return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
	}
	
	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleString();
	}
	
	function handleDeleteClick() {
		showDeleteModal = true;
	}
	
	function handleDeleteConfirm() {
		showDeleteModal = false;
		onDelete(file);
	}
	
	function handleDeleteCancel() {
		showDeleteModal = false;
	}
</script>

<div class="bg-card border rounded-lg p-6 hover:bg-accent/50 transition-colors">
	<div class="flex items-start justify-between">
		<div class="flex-1 min-w-0">
			<div class="flex items-start space-x-4">
				<div class="flex-shrink-0">
					<div class="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
						<FileText class="w-5 h-5 text-muted-foreground" />
					</div>
				</div>
				<div class="flex-1 min-w-0">
					<h3 class="text-lg font-semibold text-foreground truncate mb-2">
						{file.name}
					</h3>
					<div class="space-y-2">
						<div class="flex items-center space-x-4 text-sm text-muted-foreground">
							<span>{formatFileSize(file.size)}</span>
							<span class="flex items-center space-x-1">
								<Clock class="w-3 h-3" />
								<span>{formatDate(file.uploadedAt)}</span>
							</span>
						</div>
						{#if file.budgetData}
							<div class="flex items-center space-x-3">
								<span class="inline-flex items-center space-x-1.5 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-md">
									<CheckCircle class="w-3 h-3" />
									<span>Procesado</span>
								</span>
								<span class="text-muted-foreground text-sm">
									{file.budgetData.items.length} elementos
								</span>
								{#if file.budgetData.aiUsage}
									<AiUsageDisplay usage={file.budgetData.aiUsage} variant="compact" />
								{/if}
							</div>
						{:else}
							<span class="inline-flex items-center space-x-1.5 px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-md">
								<Clock class="w-3 h-3" />
								<span>Listo para procesar</span>
							</span>
						{/if}
					</div>
				</div>
			</div>
		</div>
		
		<div class="flex items-center space-x-2 ml-4">
			<Button onclick={() => onSelect(file)} size="sm">
				<Eye class="w-4 h-4 mr-2" />
				Ver Archivo
			</Button>
			<Button variant="ghost" size="sm" onclick={handleDeleteClick} class="p-2">
				<Trash2 class="w-4 h-4" />
			</Button>
		</div>
	</div>
</div>

<ConfirmationModal
	isOpen={showDeleteModal}
	title="Eliminar Archivo"
	message="¿Está seguro que desea eliminar este archivo? Esta acción no se puede deshacer."
	confirmText="Eliminar"
	cancelText="Cancelar"
	variant="danger"
	onConfirm={handleDeleteConfirm}
	onCancel={handleDeleteCancel}
/>