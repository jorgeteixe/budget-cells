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
			const pageText = textContent.items.map((item: any) => item.str).join(' ');
			fullText += pageText + '\n';
		}
		
		onProgress?.('PDF processing complete!');
		
		return fullText.trim();
		
	} catch (error) {
		onProgress?.(`Error: ${error}`);
		throw new Error(`PDF processing failed: ${error}`);
	}
}