<script lang="ts">
	import { AlertTriangle, AlertCircle, Info } from 'lucide-svelte';
	
	interface Props {
		isOpen: boolean;
		title: string;
		message: string;
		confirmText?: string;
		cancelText?: string;
		variant?: 'danger' | 'warning' | 'info';
		onConfirm: () => void;
		onCancel: () => void;
	}
	
	let { 
		isOpen, 
		title, 
		message, 
		confirmText = 'Confirm', 
		cancelText = 'Cancel',
		variant = 'danger',
		onConfirm, 
		onCancel 
	}: Props = $props();
	
	const variantStyles = {
		danger: 'bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700',
		warning: 'bg-orange-600 hover:bg-orange-700 text-white border-orange-600 hover:border-orange-700',
		info: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700'
	};
	
	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onCancel();
		}
	}
	
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onCancel();
		}
	}
</script>

{#if isOpen}
	<!-- Modal backdrop -->
	<div
		class="fixed inset-0 transition-opacity z-50 bg-black/50"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		role="button"
		tabindex="0"
		aria-label="Close modal"
	>
		<div class="flex min-h-full items-center justify-center p-4">
				<div 
					class="relative transform overflow-hidden rounded-lg bg-white border border-gray-200 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6"
					role="dialog"
					aria-modal="true"
					aria-labelledby="modal-title"
					tabindex="-1"
					onclick={(e) => e.stopPropagation()}
					onkeydown={(e) => e.stopPropagation()}
				>
					<div class="sm:flex sm:items-start">
						<div class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full {variant === 'danger' ? 'bg-red-100' : variant === 'warning' ? 'bg-orange-100' : 'bg-blue-100'} sm:mx-0 sm:h-10 sm:w-10">
							{#if variant === 'danger'}
								<AlertTriangle class="h-6 w-6 text-red-600" />
							{:else if variant === 'warning'}
								<AlertCircle class="h-6 w-6 text-orange-600" />
							{:else}
								<Info class="h-6 w-6 text-blue-600" />
							{/if}
						</div>
						<div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
							<h3 class="text-base font-semibold leading-6 text-foreground" id="modal-title">
								{title}
							</h3>
							<div class="mt-2">
								<p class="text-sm text-muted-foreground">
									{message}
								</p>
							</div>
						</div>
					</div>
					<div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
						<button
							type="button"
							class="inline-flex w-full justify-center rounded-md border px-3 py-2 text-sm font-semibold transition-colors cursor-pointer sm:ml-3 sm:w-auto {variantStyles[variant]}"
							onclick={onConfirm}
						>
							{confirmText}
						</button>
						<button
							type="button"
							class="mt-3 inline-flex w-full justify-center rounded-md bg-background border px-3 py-2 text-sm font-semibold text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer sm:mt-0 sm:w-auto"
							onclick={onCancel}
						>
							{cancelText}
						</button>
					</div>
				</div>
		</div>
	</div>
{/if}