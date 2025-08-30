export interface BudgetItem {
	type: 'line' | 'separator';
	id: string;
	lineId?: string; // From PDF (like "1.1", "A.01", etc.)
	description: string;
	chunks: string[];
	quantity?: number;
	unit?: string;
	unitPrice?: number;
	total?: number;
	copiedChunks: boolean[];
	copiedUnit?: boolean;
	copiedQuantity?: boolean;
	copiedUnitPrice?: boolean;
	copiedTotal?: boolean;
}

export interface AiUsage {
	inputTokens: number;
	outputTokens: number;
	totalTokens: number;
	estimatedCost: number; // in EUR
}

export interface AiUsageRecord {
	id: string;
	fileId: string;
	fileName: string;
	operation: 'process' | 'reprocess';
	timestamp: string;
	usage: AiUsage;
	tokenCostPer1k: number; // Cost rate used for this operation
}

export interface BudgetData {
	items: BudgetItem[];
	extractedAt: string;
	processedAt: string;
	aiUsage?: AiUsage;
}

export interface StoredFile {
	id: string;
	name: string;
	size: number;
	lastModified: number;
	uploadedAt: string;
	file: File;
}

export interface FileWithBudgetData extends StoredFile {
	budgetData?: BudgetData;
}

export interface AppSettings {
	geminiApiKey: string;
	maxChunkLength: number;
	tokenCostPer1k: number; // Cost per 1000 tokens in EUR
}

export interface ProcessingState {
	isProcessing: boolean;
	selectedFileId: string | null;
	error: string | null;
}