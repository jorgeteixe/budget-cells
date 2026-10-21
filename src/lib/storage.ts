import type { AppSettings } from './types.js';

const SETTINGS_KEY = 'budget-cells-settings';

const DEFAULT_SETTINGS: AppSettings = {
	geminiApiKey: '',
	geminiModel: 'gemini-2.5-flash',
	maxChunkLength: 256,
	tokenCostPer1k: 0.00015
};

export function loadSettings(): AppSettings {
	if (typeof window === 'undefined') {
		return { ...DEFAULT_SETTINGS };
	}

	const stored = localStorage.getItem(SETTINGS_KEY);
	if (stored) {
		try {
			const parsed = JSON.parse(stored);
			// Migrate old settings by adding new fields with defaults
			return {
				geminiApiKey: parsed.geminiApiKey || '',
				geminiModel: parsed.geminiModel || DEFAULT_SETTINGS.geminiModel,
				maxChunkLength: parsed.maxChunkLength || 256,
				tokenCostPer1k: parsed.tokenCostPer1k ?? 0.00015
			};
		} catch {
			// Fall through to default
		}
	}

	return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: AppSettings): void {
	if (typeof window !== 'undefined') {
		localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
	}
}