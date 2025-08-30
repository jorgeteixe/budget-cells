import type { StoredFile, AiUsageRecord, BudgetData } from './types.js';

const DB_NAME = 'BudgetCellsDB';
const DB_VERSION = 3; // Increased version for budget data store
const FILE_STORE = 'files';
const AI_USAGE_STORE = 'aiUsage';
const BUDGET_DATA_STORE = 'budgetData';

interface BudgetDataRecord {
	fileId: string;
	budgetData: BudgetData;
	processedAt: string;
}

interface DBSchema {
	files: StoredFile;
	aiUsage: AiUsageRecord;
	budgetData: BudgetDataRecord;
}

class BudgetDB {
	private db: IDBDatabase | null = null;

	async init(): Promise<void> {
		if (this.db) return;

		return new Promise((resolve, reject) => {
			const request = indexedDB.open(DB_NAME, DB_VERSION);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				this.db = request.result;
				resolve();
			};

			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;
				
				if (!db.objectStoreNames.contains(FILE_STORE)) {
					const fileStore = db.createObjectStore(FILE_STORE, { keyPath: 'id' });
					fileStore.createIndex('name', 'name');
					fileStore.createIndex('uploadedAt', 'uploadedAt');
				}
				
				if (!db.objectStoreNames.contains(AI_USAGE_STORE)) {
					const aiUsageStore = db.createObjectStore(AI_USAGE_STORE, { keyPath: 'id' });
					aiUsageStore.createIndex('fileId', 'fileId');
					aiUsageStore.createIndex('timestamp', 'timestamp');
					aiUsageStore.createIndex('operation', 'operation');
				}
				
				if (!db.objectStoreNames.contains(BUDGET_DATA_STORE)) {
					const budgetDataStore = db.createObjectStore(BUDGET_DATA_STORE, { keyPath: 'fileId' });
					budgetDataStore.createIndex('processedAt', 'processedAt');
				}
			};
		});
	}

	async saveFile(file: File): Promise<StoredFile> {
		await this.init();
		
		const storedFile: StoredFile = {
			id: crypto.randomUUID(),
			name: file.name,
			size: file.size,
			lastModified: file.lastModified,
			uploadedAt: new Date().toISOString(),
			file
		};

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([FILE_STORE], 'readwrite');
			const store = transaction.objectStore(FILE_STORE);
			const request = store.add(storedFile);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(storedFile);
		});
	}

	async getFiles(): Promise<StoredFile[]> {
		await this.init();

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([FILE_STORE], 'readonly');
			const store = transaction.objectStore(FILE_STORE);
			const request = store.getAll();

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result);
		});
	}

	async getFile(id: string): Promise<StoredFile | null> {
		await this.init();

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([FILE_STORE], 'readonly');
			const store = transaction.objectStore(FILE_STORE);
			const request = store.get(id);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result || null);
		});
	}

	async updateFile(storedFile: StoredFile): Promise<void> {
		await this.init();

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([FILE_STORE], 'readwrite');
			const store = transaction.objectStore(FILE_STORE);
			
			// First get the existing file to preserve the File object
			const getRequest = store.get(storedFile.id);
			
			getRequest.onsuccess = () => {
				const existingFile = getRequest.result;
				if (existingFile) {
					// Update the existing file while preserving the File object
					const updatedFile = { ...storedFile, file: existingFile.file };
					const putRequest = store.put(updatedFile);
					
					putRequest.onerror = () => reject(putRequest.error);
					putRequest.onsuccess = () => resolve();
				} else {
					reject(new Error('File not found'));
				}
			};
			
			getRequest.onerror = () => reject(getRequest.error);
		});
	}

	async deleteFile(id: string): Promise<void> {
		await this.init();

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([FILE_STORE], 'readwrite');
			const store = transaction.objectStore(FILE_STORE);
			const request = store.delete(id);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve();
		});
	}

	async saveAiUsage(record: AiUsageRecord): Promise<void> {
		await this.init();

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([AI_USAGE_STORE], 'readwrite');
			const store = transaction.objectStore(AI_USAGE_STORE);
			const request = store.add(record);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve();
		});
	}

	async getAllAiUsage(): Promise<AiUsageRecord[]> {
		await this.init();

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([AI_USAGE_STORE], 'readonly');
			const store = transaction.objectStore(AI_USAGE_STORE);
			const request = store.getAll();

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result);
		});
	}

	async getAiUsageByFileId(fileId: string): Promise<AiUsageRecord[]> {
		await this.init();

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([AI_USAGE_STORE], 'readonly');
			const store = transaction.objectStore(AI_USAGE_STORE);
			const index = store.index('fileId');
			const request = index.getAll(fileId);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result);
		});
	}

	async clearAllAiUsage(): Promise<void> {
		await this.init();

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([AI_USAGE_STORE], 'readwrite');
			const store = transaction.objectStore(AI_USAGE_STORE);
			const request = store.clear();

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve();
		});
	}

	async saveBudgetData(fileId: string, budgetData: BudgetData): Promise<void> {
		await this.init();

		const record: BudgetDataRecord = {
			fileId,
			budgetData,
			processedAt: new Date().toISOString()
		};

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([BUDGET_DATA_STORE], 'readwrite');
			const store = transaction.objectStore(BUDGET_DATA_STORE);
			const request = store.put(record);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve();
		});
	}

	async getBudgetData(fileId: string): Promise<BudgetData | null> {
		await this.init();

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([BUDGET_DATA_STORE], 'readonly');
			const store = transaction.objectStore(BUDGET_DATA_STORE);
			const request = store.get(fileId);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				const record = request.result as BudgetDataRecord | undefined;
				resolve(record ? record.budgetData : null);
			};
		});
	}

	async deleteBudgetData(fileId: string): Promise<void> {
		await this.init();

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([BUDGET_DATA_STORE], 'readwrite');
			const store = transaction.objectStore(BUDGET_DATA_STORE);
			const request = store.delete(fileId);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve();
		});
	}
}

export const budgetDB = new BudgetDB();