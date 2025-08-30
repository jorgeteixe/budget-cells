import { writable } from 'svelte/store';
import type { AppSettings, ProcessingState, StoredFile } from './types.js';

export const settings = writable<AppSettings>({
	geminiApiKey: '',
	maxChunkLength: 256,
	tokenCostPer1k: 0.00015 // Current Gemini 1.5 Flash pricing: $0.15/1M tokens ≈ 0.00015 EUR/1k tokens
});

export const processingState = writable<ProcessingState>({
	isProcessing: false,
	selectedFileId: null,
	error: null
});

export const storedFiles = writable<StoredFile[]>([]);
export const selectedFile = writable<StoredFile | null>(null);
export const currentScrollIndex = writable<number>(0);