type TextItem = {
	str: string;
	transform: number[];
	width?: number;
	height?: number;
	hasEOL?: boolean;
};

/** Group PDF.js text items into lines by Y position, preserving reading order. */
function reconstructPageText(items: TextItem[]): string {
	const withText = items.filter((item) => item.str != null && item.str.length > 0);
	if (withText.length === 0) return '';

	// Approximate line height from median item height (fallback 8)
	const heights = withText
		.map((item) => item.height || Math.abs(item.transform[3]) || 0)
		.filter((h) => h > 0)
		.sort((a, b) => a - b);
	const lineTolerance = heights.length
		? Math.max(2, heights[Math.floor(heights.length / 2)] * 0.6)
		: 4;

	type Line = { y: number; parts: { x: number; str: string; width: number }[] };
	const lines: Line[] = [];

	for (const item of withText) {
		const x = item.transform[4];
		const y = item.transform[5];
		const width = item.width ?? item.str.length * 4;
		const last = lines[lines.length - 1];

		if (last && Math.abs(last.y - y) <= lineTolerance) {
			last.parts.push({ x, str: item.str, width });
			// Prefer the leftmost y as the line anchor when items drift slightly
			last.y = (last.y * (last.parts.length - 1) + y) / last.parts.length;
		} else {
			lines.push({ y, parts: [{ x, str: item.str, width }] });
		}

		// Soft line break hint from PDF
		if (item.hasEOL) {
			lines.push({ y: y - lineTolerance * 2, parts: [] });
		}
	}

	// PDF Y grows upward — top of page first
	lines.sort((a, b) => b.y - a.y);

	return lines
		.map((line) => {
			const parts = [...line.parts].sort((a, b) => a.x - b.x);
			let text = '';
			let prevEnd = -Infinity;
			for (const part of parts) {
				if (!part.str) continue;
				const needsSpace =
					text.length > 0 &&
					!text.endsWith(' ') &&
					!part.str.startsWith(' ') &&
					part.x - prevEnd > 1.5;
				text += needsSpace ? ` ${part.str}` : part.str;
				prevEnd = part.x + part.width;
			}
			return text.trimEnd();
		})
		.filter((line, i, arr) => line.length > 0 || (i > 0 && arr[i - 1].length > 0))
		.join('\n')
		.replace(/\n{3,}/g, '\n\n');
}

export async function extractTextFromPDF(file: File, onProgress?: (status: string) => void): Promise<string> {
	try {
		onProgress?.('Loading PDF processor...');

		// Dynamic import to ensure this only runs in browser
		const pdfjs = await import('pdfjs-dist');

		// Use local worker file to avoid CORS issues
		pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

		onProgress?.('Reading PDF file...');

		const buffer = await file.arrayBuffer();
		const pdf = await pdfjs.getDocument({ data: buffer }).promise;

		onProgress?.(`Extracting text from ${pdf.numPages} pages...`);

		let fullText = '';

		for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
			onProgress?.(`Processing page ${pageNum} of ${pdf.numPages}...`);

			const page = await pdf.getPage(pageNum);
			const textContent = await page.getTextContent();
			const items: TextItem[] = [];
			for (const item of textContent.items) {
				if ('str' in item && typeof item.str === 'string' && Array.isArray(item.transform)) {
					items.push(item as TextItem);
				}
			}
			const pageText = reconstructPageText(items);
			fullText += pageText + '\n\n';
		}

		onProgress?.('PDF processing complete!');

		return fullText.trim();
	} catch (error) {
		onProgress?.(`Error: ${error}`);
		throw new Error(`PDF processing failed: ${error}`);
	}
}
