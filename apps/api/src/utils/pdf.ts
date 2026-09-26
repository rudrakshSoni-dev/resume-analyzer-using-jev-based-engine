import pdfParse from 'pdf-parse';

export interface ExtractedPdf {
  text: string;
  numpages: number;
}

/**
 * Extracts plain text from a PDF Buffer.
 * Cleans control characters and validates non-empty text.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
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
  }
}
