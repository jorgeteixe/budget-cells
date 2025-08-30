<script lang="ts">
	interface Props {
		isProcessing: boolean;
		status?: string;
		error?: string | null;
	}
	
	let { isProcessing, status, error }: Props = $props();
</script>

{#if isProcessing}
	<div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
		<div class="text-center">
			<div class="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
			<h3 class="text-lg font-semibold text-blue-900 mb-2">Procesando su PDF</h3>
			<p class="text-sm text-blue-700 mb-3">
				{status || 'La IA está extrayendo elementos del presupuesto de su PDF...'}
			</p>
			<div class="bg-orange-50 border border-orange-200 rounded-md p-3">
				<p class="text-xs font-medium text-orange-800 flex items-center justify-center">
					<svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
					</svg>
					⚠️ Por favor no cierre esta página durante el procesamiento
				</p>
			</div>
		</div>
	</div>
{/if}

{#if error}
	<div class="bg-destructive/10 border border-destructive/20 rounded-md p-4">
		<div class="text-sm text-destructive">{error}</div>
	</div>
{/if}