// app/api/convert/pdf-to-text/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../utils/supabase/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import PdfParser from 'pdf2json';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Get the file from the request
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Convert file to buffer for processing
    const buffer = await file.arrayBuffer();
    
    // Create a temporary file
    const tempDir = os.tmpdir();
    const tempPdfPath = path.join(tempDir, `${uuidv4()}_temp.pdf`);
    
    // Write the buffer to the temporary file
    fs.writeFileSync(tempPdfPath, Buffer.from(buffer));
    
    // Set up the PDF parser
    const pdfParser = new PdfParser();
    
    // Create a promise to handle the PDF parsing
    const textContent = await new Promise<string>((resolve, reject) => {
      pdfParser.on("pdfParser_dataError", (errData) => {
        console.error('PDF parsing error:', errData);
        reject(new Error('PDF parsing failed'));
      });
      
      pdfParser.on("pdfParser_dataReady", (pdfData) => {
        try {
          // Convert PDF data to text
          const pages = pdfData.Pages || [];
          let text = '';
          
          // Extract text from each page
          for (const page of pages) {
            const texts = page.Texts || [];
            for (const textItem of texts) {
              // Decode the text elements
              const decodedText = decodeURIComponent(textItem.R.map(r => r.T).join(' '));
              text += decodedText + ' ';
            }
            // Add newline between pages
            text += '\n\n';
          }
          
          resolve(text.trim() || '[PDF text extraction failed - No text found]');
        } catch (err) {
          console.error('Error processing PDF data:', err);
          reject(new Error('Error extracting text from PDF'));
        }
      });
      
      // Load and parse the PDF file
      pdfParser.loadPDF(tempPdfPath);
    });
    
    // Clean up the temporary file
    try {
      fs.unlinkSync(tempPdfPath);
    } catch (e) {
      console.error('Failed to delete temporary file:', e);
    }
    
    // Count characters
    const characterCount = textContent.length;
    
    // Return the extracted text content
    return NextResponse.json({
      text: textContent,
      characterCount,
      originalName: file.name
    });
    
  } catch (error) {
    console.error('PDF conversion error:', error);
    return NextResponse.json(
      { error: 'An error occurred during PDF conversion', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}