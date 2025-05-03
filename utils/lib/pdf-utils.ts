// utils/lib/pdf-utils.ts (simplified version)
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
    
    // Get the text content
    const textContent = data.text;
    
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