import { GoogleGenerativeAI } from '@google/generative-ai';
import type { BudgetItem, BudgetData, AiUsage } from './types.js';

function chunkDescription(description: string, maxLength: number): string[] {
	if (description.length <= maxLength) {
		return [description];
	}

	const chunks: string[] = [];
	let currentChunk = '';
	
	// Split by sentences first (periods, exclamation marks, question marks)
	const sentences = description.split(/([.!?]+\s+)/).filter(s => s.trim());
	
	for (const sentence of sentences) {
		const testChunk = currentChunk ? `${currentChunk}${sentence}` : sentence;
		
		if (testChunk.length > maxLength && currentChunk) {
			// Current chunk is full, start new chunk
			chunks.push(currentChunk.trim());
			currentChunk = sentence;
		} else if (sentence.length > maxLength) {
			// Single sentence is too long, split by phrases (commas, semicolons)
			if (currentChunk) {
				chunks.push(currentChunk.trim());
				currentChunk = '';
			}
			
			const phrases = sentence.split(/([,;]\s+)/).filter(p => p.trim());
			for (const phrase of phrases) {
				const testPhrase = currentChunk ? `${currentChunk}${phrase}` : phrase;
				
				if (testPhrase.length > maxLength && currentChunk) {
					chunks.push(currentChunk.trim());
					currentChunk = phrase;
				} else if (phrase.length > maxLength) {
					// Even phrase is too long, fall back to word splitting
					if (currentChunk) {
						chunks.push(currentChunk.trim());
						currentChunk = '';
					}
					
					const words = phrase.split(' ');
					for (const word of words) {
						const testWord = currentChunk ? `${currentChunk} ${word}` : word;
						
						if (testWord.length > maxLength && currentChunk) {
							chunks.push(currentChunk.trim());
							currentChunk = word;
						} else {
							currentChunk = testWord;
						}
					}
				} else {
					currentChunk = testPhrase;
				}
			}
		} else {
			currentChunk = testChunk;
		}
	}

	if (currentChunk.trim()) {
		chunks.push(currentChunk.trim());
	}

	return chunks.filter(chunk => chunk.length > 0);
}

function splitTextIntoChunks(text: string, maxChunkSize: number = 20000): string[] {
	const chunks: string[] = [];
	const lines = text.split('\n');
	let currentChunk = '';
	
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const testChunk = currentChunk ? `${currentChunk}\n${line}` : line;
		
		if (testChunk.length > maxChunkSize && currentChunk) {
			// Look for natural breaking points before splitting
			const breakPoint = findNaturalBreakPoint(lines, i, maxChunkSize, currentChunk);
			
			if (breakPoint > 0 && breakPoint < i) {
				// Found a good break point, rebuild chunk up to that point
				const naturalChunk = lines.slice(0, breakPoint + 1).join('\n');
				if (naturalChunk.length <= currentChunk.length) {
					chunks.push(currentChunk);
					currentChunk = line;
				} else {
					// Use the natural break point
					chunks.push(naturalChunk);
					currentChunk = lines.slice(breakPoint + 1, i + 1).join('\n');
				}
			} else {
				// No good break point found, use current approach
				chunks.push(currentChunk);
				currentChunk = line;
			}
		} else {
			currentChunk = testChunk;
		}
	}
	
	if (currentChunk) {
		chunks.push(currentChunk);
	}
	
	return chunks.filter(chunk => chunk.trim().length > 0);
}

function findNaturalBreakPoint(lines: string[], currentIndex: number, maxChunkSize: number, currentChunk: string): number {
	// Look backwards for natural section breaks
	for (let i = Math.max(0, currentIndex - 50); i < currentIndex; i++) {
		const line = lines[i].trim();
		
		// Check if this line looks like a section header or natural break
		if (isNaturalBreakLine(line) && 
			currentChunk.length - lines.slice(i + 1, currentIndex).join('\n').length < maxChunkSize * 0.8) {
			return i;
		}
	}
	
	return -1;
}

function isNaturalBreakLine(line: string): boolean {
	const trimmed = line.trim();
	
	// Empty lines are natural breaks
	if (!trimmed) return true;
	
	// Chapter/section numbers (e.g., "1.", "1.1", "CHAPTER 1", "CAPÍTULO 1")
	if (/^(\d+\.?\s|\d+\.\d+\.?\s|CHAPTER\s+\d+|CAPÍTULO\s+\d+|CAP\.\s*\d+)/i.test(trimmed)) return true;
	
	// Lines that are all caps and short (likely headers)
	if (trimmed === trimmed.toUpperCase() && trimmed.length < 100 && !/[.,:;]/.test(trimmed)) return true;
	
	// Lines that start with common section indicators
	if (/^(OBRA|PARTIDA|UNIDAD|MEDICIÓN|RESUMEN|TOTAL|SUBTOTAL|PRESUPUESTO)/i.test(trimmed)) return true;
	
	// Lines with repeated characters (decorative separators)
	if (/^[=\-_*]{3,}$/.test(trimmed)) return true;
	
	// Page breaks or form feeds
	if (/^(PÁGINA|PAGE|\f)/.test(trimmed)) return true;
	
	return false;
}

async function processChunkWithGemini(
	text: string, 
	apiKey: string, 
	chunkIndex: number
): Promise<{ items: any[], usage?: any }> {
	const genAI = new GoogleGenerativeAI(apiKey);
	const model = genAI.getGenerativeModel({
		model: 'gemini-2.5-flash',
		generationConfig: {
			responseMimeType: 'application/json',
			maxOutputTokens: 65536
		}
	});

	const prompt = `
Extract budget items from this construction budget PDF text chunk ${chunkIndex + 1}. Extract both line items and category separators:

For LINE ITEMS, identify:
- lineId: Any item number from PDF (like "1.1", "A.01", "001", etc.) or null if none
- description: Full text describing the work/item  
- quantity: Numeric value (default 1 if unclear)
- unit: Unit like "m²", "ml", "ud", "h", etc. (default "ud" if unclear)
- unitPrice: Price per unit in euros (default 0 if unclear)  
- total: Total cost in euros (default 0 if unclear)

For SEPARATORS (category headers, section titles), identify:
- description: The header/category text
- Set all other fields to null/0

Return JSON in this exact format:
{
  "items": [
    {
      "type": "separator",
      "lineId": null,
      "description": "Category or section header text",
      "quantity": null,
      "unit": null,
      "unitPrice": 0,
      "total": 0
    },
    {
      "type": "line", 
      "lineId": "1.1",
      "description": "Line item description",
      "quantity": 5,
      "unit": "m²",
      "unitPrice": 25.50,
      "total": 127.50
    }
  ]
}

Text to process:
${text}
`;

	const result = await model.generateContent(prompt);
	const response = result.response.text();

	// Extract usage metadata if available
	const usage = result.response.usageMetadata;

	try {
		const parsed = JSON.parse(response);
		const items = parsed.items || [];
		console.log(`Chunk ${chunkIndex + 1} parsed successfully: ${items.length} items extracted`);
		return {
			items,
			usage: usage ? {
				promptTokens: usage.promptTokenCount || 0,
				candidatesTokens: usage.candidatesTokenCount || 0,
				totalTokens: usage.totalTokenCount || 0
			} : undefined
		};
	} catch (error) {
		console.error(`Failed to parse chunk ${chunkIndex + 1}:`, error);
		console.error(`Response preview: ${response.substring(0, 500)}...`);
		console.error(`Response length: ${response.length} characters`);
		throw new Error(`Chunk ${chunkIndex + 1} parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

export async function processWithGemini(
	text: string, 
	apiKey: string, 
	maxChunkLength: number,
	tokenCostPer1k: number,
	onProgress?: (status: string) => void
): Promise<BudgetData> {
	try {
		// Split text into manageable chunks
		const textChunks = splitTextIntoChunks(text, 20000);
		onProgress?.(`Processing ${textChunks.length} chunks with Gemini AI...`);
		
		let allItems: any[] = [];
		let totalInputTokens = 0;
		let totalOutputTokens = 0;
		let totalTokens = 0;
		
		// Process each chunk sequentially to avoid rate limits
		for (let i = 0; i < textChunks.length; i++) {
			onProgress?.(`Processing chunk ${i + 1} of ${textChunks.length}...`);

			try {
				const chunkResult = await processChunkWithGemini(textChunks[i], apiKey, i);
				allItems = allItems.concat(chunkResult.items);

				console.log(`Total items so far: ${allItems.length}`);
				onProgress?.(`Chunk ${i + 1}/${textChunks.length}: ${chunkResult.items.length} items extracted (total: ${allItems.length})`);

				// Track token usage
				if (chunkResult.usage) {
					totalInputTokens += chunkResult.usage.promptTokens;
					totalOutputTokens += chunkResult.usage.candidatesTokens;
					totalTokens += chunkResult.usage.totalTokens;
				}
			} catch (error) {
				const errorMsg = `Error processing chunk ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`;
				console.error(errorMsg);
				onProgress?.(errorMsg);
				throw error; // Re-throw to stop processing on error
			}

			// Small delay between requests to avoid rate limiting
			if (i < textChunks.length - 1) {
				await new Promise(resolve => setTimeout(resolve, 500));
			}
		}
		
		onProgress?.(`Organizing ${allItems.length} budget items...`);
		
		// Convert to our format with chunked descriptions
		const items: BudgetItem[] = allItems.map((item: any, index: number) => {
			const chunks = chunkDescription(item.description || 'No description', maxChunkLength);
			return {
				id: crypto.randomUUID(),
				type: item.type || 'line',
				lineId: item.lineId || null,
				description: item.description || 'No description',
				chunks,
				quantity: item.type === 'separator' ? undefined : (Number(item.quantity) || 1),
				unit: item.type === 'separator' ? undefined : (item.unit || 'ud'),
				unitPrice: item.type === 'separator' ? undefined : (Number(item.unitPrice) || 0),
				total: item.type === 'separator' ? undefined : (Number(item.total) || 0),
				copiedChunks: new Array(chunks.length).fill(false),
				copiedUnit: false,
				copiedQuantity: false,
				copiedUnitPrice: false,
				copiedTotal: false
			};
		});

		// Calculate estimated cost
		const estimatedCost = (totalTokens / 1000) * tokenCostPer1k;
		
		const aiUsage: AiUsage = {
			inputTokens: totalInputTokens,
			outputTokens: totalOutputTokens,
			totalTokens: totalTokens,
			estimatedCost: estimatedCost
		};

		return {
			items,
			extractedAt: new Date().toISOString(),
			processedAt: new Date().toISOString(),
			aiUsage
		};
		
	} catch (error) {
		throw new Error(`Gemini processing failed: ${error}`);
	}
}