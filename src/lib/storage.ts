import type { AppSettings } from './types.js';

const SETTINGS_KEY = 'budget-cells-settings';

export function loadSettings(): AppSettings {
	if (typeof window === 'undefined') {
		return { 
			geminiApiKey: '', 
			maxChunkLength: 256,
			tokenCostPer1k: 0.00015
		};
	}

	const stored = localStorage.getItem(SETTINGS_KEY);
	if (stored) {
		try {
			const parsed = JSON.parse(stored);
			// Migrate old settings by adding new fields with defaults
			return {
				geminiApiKey: parsed.geminiApiKey || '',
				maxChunkLength: parsed.maxChunkLength || 256,
				tokenCostPer1k: parsed.tokenCostPer1k ?? 0.00015
			};
		} catch {
			// Fall through to default
		}
	}

	return { 
		geminiApiKey: '', 
		maxChunkLength: 256,
		tokenCostPer1k: 0.00015
	};
}

export function saveSettings(settings: AppSettings): void {
	if (typeof window !== 'undefined') {
		localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
	}
}