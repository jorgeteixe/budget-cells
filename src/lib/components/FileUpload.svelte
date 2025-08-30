<script lang="ts">
	import Button from './Button.svelte';
	import { Upload } from 'lucide-svelte';
	
	interface Props {
		onFileSelected: (file: File) => void;
		disabled?: boolean;
	}
	
	let { onFileSelected, disabled = false }: Props = $props();
	let fileInput: HTMLInputElement;
	
	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		
		if (!file) return;
		
		if (!file.type.includes('pdf')) {
			alert('Por favor selecciona un archivo PDF');
			return;
		}
		
		onFileSelected(file);
		if (fileInput) fileInput.value = '';
	}
</script>

<div>
	<label for="file-upload" class="block text-sm font-medium text-foreground mb-2">
		Subir Nuevo PDF
	</label>
	<div class="relative">
		<input
			bind:this={fileInput}
			id="file-upload"
			type="file"
			accept=".pdf"
			onchange={handleFileChange}
			{disabled}
			class="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
		/>
		<Button class="w-full" disabled={disabled}>
			<Upload class="w-5 h-5 mr-2" />
			Elegir Archivo PDF
		</Button>
	</div>
</div>