import { writable } from 'svelte/store';
import type { AppSettings, ProcessingState, StoredFile } from './types.js';

export const settings = writable<AppSettings>({
	geminiApiKey: '',
	geminiModel: 'gemini-2.5-flash',
	maxChunkLength: 256,
	tokenCostPer1k: 0.00015 // Approximate Flash pricing; adjust in settings if needed
});

export const processingState = writable<ProcessingState>({
	isProcessing: false,
	selectedFileId: null,
	error: null
});

export const storedFiles = writable<StoredFile[]>([]);
export const selectedFile = writable<StoredFile | null>(null);
export const currentScrollIndex = writable<number>(0);