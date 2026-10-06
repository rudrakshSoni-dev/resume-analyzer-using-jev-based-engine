import './polyfills.js';

export interface ExtractedPdf {
  text: string;
  numpages?: number;
}

/**
 * Extracts plain text from a PDF Buffer.
 * Cleans control characters and validates non-empty text.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // Validate PDF magic bytes (%PDF = 0x25 0x50 0x44 0x46)
  if (!buffer || buffer.length < 4 || buffer.toString('ascii', 0, 4) !== '%PDF') {
    const error: any = new Error('Invalid PDF file format: missing %PDF header');
    error.statusCode = 400;
    throw error;
  }

  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });
  try {
    const data = await parser.getText();
    const cleanedText = data.text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\0/g, '')
      .trim();

    if (!cleanedText || cleanedText.length === 0) {
      const error: any = new Error('PDF contains no extractable text');
      error.statusCode = 400;
      throw error;
    }

    return cleanedText;
  } catch (err: any) {
    if (err.statusCode) {
      throw err;
    }
    const error: any = new Error(`Failed to parse PDF: ${err.message || 'Invalid or corrupted file'}`);
    error.statusCode = 400;
    throw error;
  } finally {
    await parser.destroy();
  }
}
