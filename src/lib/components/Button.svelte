<script lang="ts">
	import type { Snippet } from 'svelte';
	
	interface Props {
		variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
		size?: 'sm' | 'md' | 'lg';
		disabled?: boolean;
		onclick?: () => void;
		type?: 'button' | 'submit' | 'reset';
		class?: string;
		children: Snippet;
	}
	
	let { 
		variant = 'primary', 
		size = 'md', 
		disabled = false, 
		onclick, 
		type = 'button', 
		class: className = '',
		children 
	}: Props = $props();
	
	const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
	
	const variantClasses = {
		primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
		secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
		outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
		ghost: 'hover:bg-accent hover:text-accent-foreground',
		destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
	};
	
	const sizeClasses = {
		sm: 'h-9 px-3 text-sm',
		md: 'h-10 px-4 py-2 text-base',
		lg: 'h-11 px-8 text-lg'
	};
	
	const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
</script>

<button 
	{type} 
	{disabled} 
	{onclick}
	class={classes}
>
	{@render children()}
</button>