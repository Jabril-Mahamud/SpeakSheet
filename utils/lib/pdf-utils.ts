import fs from 'fs';
import { PassThrough } from 'stream';
import pdfParse from 'pdf-parse';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

/**
 * Extracts text from a PDF buffer using pdf-parse, with optional streaming for large files.
 * @param buffer PDF file buffer or ArrayBuffer
 * @param originalName Original file name
 * @returns Extracted text, character count, and original name
 */
export async function extractTextFromPdf(
  buffer: Buffer | ArrayBuffer,
  originalName: string
): Promise<{
  text: string;
  characterCount: number;
  originalName: string;
}> {
  // Ensure Node Buffer
  const nodeBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  let text = '';

  try {
    // Use temp file if buffer too large for memory
    if (nodeBuffer.length > 50 * 1024 * 1024) {
      const tempPath = `${os.tmpdir()}/${uuidv4()}_large.pdf`;
      fs.writeFileSync(tempPath, nodeBuffer);
      
      // Read the file back into a buffer before parsing
      const fileBuffer = fs.readFileSync(tempPath);
      const data = await pdfParse(fileBuffer);
      
      text = data.text;
      fs.unlinkSync(tempPath);
    } else {
      // Direct parse for smaller files
      const data = await pdfParse(nodeBuffer);
      text = data.text;
    }

    // Fallback for empty extraction
    if (!text.trim()) {
      text = '[PDF text extraction failed: possible scanned document]';
    }
  } catch (err) {
    console.error('PDF parse error:', err);
    text = '[PDF parsing error: document may be corrupted or encrypted]';
  }

  return {
    text: text.trim(),
    characterCount: text.length,
    originalName,
  };
}

/**
 * Simple text file extraction
 */
export function extractTextFromTextFile(
  buffer: Buffer | ArrayBuffer,
  originalName: string
): { text: string; characterCount: number; originalName: string } {
  let text = '';
  if (Buffer.isBuffer(buffer)) text = buffer.toString('utf8');
  else text = new TextDecoder().decode(new Uint8Array(buffer));
  return { text, characterCount: text.length, originalName };
}

/**
 * Main dispatcher for file text extraction
 */
export async function extractTextFromFile(
  buffer: Buffer | ArrayBuffer,
  originalName: string,
  mimeType: string
): Promise<{ text: string; characterCount: number; originalName: string }> {
  const isPdf = mimeType === 'application/pdf' || originalName.toLowerCase().endsWith('.pdf');
  if (isPdf) {
    return extractTextFromPdf(buffer, originalName);
  }
  // Fallback to text for common extensions
  return extractTextFromTextFile(buffer, originalName);
}

/**
 * Validate if file is PDF
 */
export function isPdfFile(name: string, mimeType?: string): boolean {
  return (
    !!name.toLowerCase().endsWith('.pdf') ||
    (mimeType ? mimeType === 'application/pdf' : false)
  );
}
