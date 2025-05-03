// utils/lib/pdf-utils.ts
import { v4 as uuidv4 } from 'uuid';
import pdfParse from 'pdf-parse';

/**
 * Extracts text from a PDF buffer using pdf-parse
 * @param buffer The PDF file buffer
 * @returns Object containing extracted text and character count
 */
export async function extractTextFromPdf(buffer: ArrayBuffer): Promise<{ text: string; characterCount: number }> {
  try {
    // Convert ArrayBuffer to Buffer for pdf-parse
    const nodeBuffer = Buffer.from(buffer);
    
    // Use pdf-parse with default options
    const data = await pdfParse(nodeBuffer);
    
    // Clean up the text content
    const textContent = data.text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/([a-z])- ([a-z])/g, '$1$2') // Fix hyphenated words
      .replace(/\s{2,}/g, ' ') // Remove multiple spaces
      .trim();
    
    // Count characters
    const characterCount = textContent.length;
    
    return {
      text: textContent,
      characterCount
    };
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}