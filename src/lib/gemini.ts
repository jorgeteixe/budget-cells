import { GoogleGenerativeAI } from '@google/generative-ai';
import type { BudgetItem, BudgetData, AiUsage } from './types.js';

export interface GeminiModel {
	name: string;
	displayName: string;
	description?: string;
}

export async function fetchAvailableModels(apiKey: string): Promise<GeminiModel[]> {
	try {
		// Use the REST API directly since the SDK doesn't expose listModels in the client
		const response = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
		);

		if (!response.ok) {
			throw new Error(`API responded with status ${response.status}`);
		}

		const data = await response.json();

		// Filter for models that support generateContent (text generation)
		// and exclude embedding/vision-only models
		const models = data.models
			.filter((model: any) =>
				model.supportedGenerationMethods?.includes('generateContent') &&
				!model.name.includes('embedding')
			)
			.map((model: any) => ({
				name: model.name.replace('models/', ''),
				displayName: model.displayName || model.name.replace('models/', ''),
				description: model.description
			}))
			.sort((a: GeminiModel, b: GeminiModel) => a.displayName.localeCompare(b.displayName));

		return models;
	} catch (error) {
		console.error('Failed to fetch models from API:', error);
		throw new Error(`Failed to fetch models: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

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

/**
 * Safety net: if the model still appends MEDICIONES breakdown tables to a
 * description, cut them off so they never become copy-paste chunks.
 */
export function stripMeasurementDetails(description: string): string {
	if (!description) return description;

	const normalized = description.replace(/\r\n/g, '\n').trim();

	// Strong signals that a mediciones breakdown table has started.
	// Capture group 1 is the content to cut from (keeps preceding prose/punctuation).
	const cutPatterns: RegExp[] = [
		/(?:^|\n|\.\s*)(Zapatas aisladas|Viga(?:s)? de atado|Vigas centradoras|Pozos cimentac[^\n]*|Planta vivienda|Perímetro edificación|Zanjas cimentaci[^\n]*|Pozos cimentaci[^\n]*|Muro perimetral|Zapata muro|Descuentos|Relleno trasdós|forjado caviti|Hormigón limpieza[^\n]*)\b/i,
		/(?:^|\n|\s)(P\d+\s*,\s*P\d+)/i, // "P1, P2..."
		/\n\s*([A-Z](?:\.[A-Z0-9]+)+)\b/, // "C.1.1", "VC.T-1" style codes on their own line
		/\b(UDS\s+LONGITUD\s+ANCHURA\s+ALTURA)\b/i,
		/\b(PARCIALES)\b/i,
		// Dimension-like rows glued after prose: "P1, P2 ... 5 1,00 1,00 0,50"
		/(?:^|\s)((?:P\d+(?:\s*,\s*P\d+)*)\s+\d+(?:[.,]\d+)?\s+\d+(?:[.,]\d+)?\s+\d+(?:[.,]\d+)?)/i,
		// Short label line immediately followed by a dimension/partial row
		/\n([^\n]{2,60})\n\s*(?:\d+\s+)?\d+[.,]\d+\s+\d+[.,]\d+/
	];

	let cutAt = -1;
	for (const pattern of cutPatterns) {
		const match = pattern.exec(normalized);
		if (!match) continue;
		const contentStart =
			match[1] != null ? match.index + match[0].lastIndexOf(match[1]) : match.index;
		if (cutAt < 0 || contentStart < cutAt) {
			cutAt = contentStart;
		}
	}

	let cleaned = cutAt >= 0 ? normalized.slice(0, cutAt) : normalized;

	// Clean hyphenation artifacts from PDF line wraps: "auxi- liares" → "auxiliares"
	cleaned = cleaned
		.replace(/(\p{L})-\s+(\p{L})/gu, '$1$2')
		.replace(/[ \t]+/g, ' ')
		.replace(/\n{2,}/g, '\n')
		.trim();

	return cleaned || description.trim();
}

async function processChunkWithGemini(
	text: string,
	apiKey: string,
	modelName: string,
	chunkIndex: number
): Promise<{ items: any[], usage?: any }> {
	const genAI = new GoogleGenerativeAI(apiKey);
	const model = genAI.getGenerativeModel({
		model: modelName,
		generationConfig: {
			responseMimeType: 'application/json',
			maxOutputTokens: 65536
		}
	});

	const prompt = `
Extract budget items from this Spanish construction budget / MEDICIONES PDF text chunk ${chunkIndex + 1}.
Extract both line items (partidas) and category separators (capítulos).

CRITICAL — Spanish MEDICIONES layout for each partida is usually:
1) Code + unit + short title (resumen)
2) Long work DESCRIPTION paragraph(s)
3) MEASUREMENT BREAKDOWN tables (labels + UDS / LONGITUD / ANCHURA / ALTURA / PARCIALES rows)
4) Final CANTIDAD (and sometimes price/total)

For LINE ITEMS:
- lineId: Item code from PDF (like "CA1.03", "1.1", "A.01") or null if none
- description: ONLY the work description text (the paragraph that explains the work).
  Optionally include the short resumen title if it adds meaning.
  DO NOT include measurement breakdown content. Never put any of this in description:
  - Subtitles like "Zapatas aisladas", "Viga de atado", "Planta vivienda", "Pozos cimentac..."
  - Location/element labels like "P1, P2, P3...", "C.1.1", "C.F.1", "VC.T-1"
  - Dimension/partial rows (numbers for uds, longitud, anchura, altura, parciales)
  - Header/footer noise (CÓDIGO, RESUMEN, UDS LONGITUD ANCHURA ALTURA, Página N, dates)
- quantity: The FINAL quantity (CANTIDAD) for the partida, NOT partial measurement rows
- unit: Unit like "m²", "m³", "ml", "ud", "h", etc. (default "ud" if unclear)
- unitPrice: Price per unit in euros (default 0 if unclear; often absent in pure mediciones)
- total: Total cost in euros (default 0 if unclear; often absent in pure mediciones)

For SEPARATORS (category headers, section titles like "CAPÍTULO CA01..."):
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
      "lineId": "CA1.03",
      "description": "Only the work description paragraph, without measurement tables",
      "quantity": 53.49,
      "unit": "m³",
      "unitPrice": 0,
      "total": 0
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
	modelName: string,
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
				const chunkResult = await processChunkWithGemini(textChunks[i], apiKey, modelName, i);
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
		const items: BudgetItem[] = allItems.map((item: any) => {
			const rawDescription = item.description || 'No description';
			const description =
				item.type === 'separator' ? rawDescription : stripMeasurementDetails(rawDescription);
			const chunks = chunkDescription(description, maxChunkLength);
			return {
				id: crypto.randomUUID(),
				type: item.type || 'line',
				lineId: item.lineId || null,
				description,
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