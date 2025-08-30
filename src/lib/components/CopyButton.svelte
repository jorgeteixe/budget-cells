<script lang="ts">
	import { Copy, Check } from 'lucide-svelte';
	
	interface Props {
		text: string;
		copied: boolean;
		disabled?: boolean;
		size?: 'sm' | 'md';
		variant?: 'primary' | 'compact';
		onclick: () => void;
	}
	
	let { text, copied, disabled = false, size = 'md', variant = 'primary', onclick }: Props = $props();
	let showFeedback = $state(false);
	
	async function handleClick() {
		onclick();
		showFeedback = true;
		setTimeout(() => {
			showFeedback = false;
		}, 1000);
	}
	
	const sizeClasses = {
		sm: 'px-3 py-2 text-xs w-24',
		md: 'px-4 py-2.5 text-sm w-28'
	};
	
	const variantClasses = {
		primary: 'bg-primary hover:bg-primary/90 text-primary-foreground border-primary',
		compact: 'bg-muted hover:bg-muted/80 text-muted-foreground border-muted'
	};
</script>

<button
	onclick={handleClick}
	{disabled}
	class="inline-flex items-center justify-center space-x-2 font-semibold rounded-md border transition-colors cursor-copy disabled:cursor-not-allowed {sizeClasses[size]} {variantClasses[variant]}"
>
	{#if showFeedback}
		<Check class="w-4 h-4 text-green-600" />
		{#if variant !== 'compact'}
			<span class="text-green-600">Copiado</span>
		{/if}
	{:else}
		<Copy class="w-4 h-4" />
		{#if variant !== 'compact'}
			<span>Copiar</span>
		{/if}
	{/if}
</button>