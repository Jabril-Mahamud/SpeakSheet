// app/api/convert/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import * as pdfjsLib from 'pdfjs-dist';
import pdfParse from 'pdf-parse';

// Set the worker source
const PDFJS_WORKER_SRC = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;

export async function POST(request: NextRequest) {
  console.log('Convert API route called');
  
  // Authentication is optional for testing
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  try {
    // Get the file from the request
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Check if file is PDF
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }
    
    console.log('File received:', file.name, 'Size:', file.size);
    
    // Convert file to buffer for processing
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log('Buffer created, size:', buffer.length);
    
    try {
      // Try both methods to parse PDF
      let textContent = '';
      let characterCount = 0;
      
      // Method 1: Use pdf-parse
      try {
        console.log('Starting pdf-parse method');
        const data = await pdfParse(buffer);
        
        // Extract and clean up text
        textContent = data.text
          .replace(/\r\n/g, '\n')
          .replace(/([a-z])- ([a-z])/g, '$1$2')
          .replace(/\s{2,}/g, ' ')
          .trim();
        
        characterCount = textContent.length;
        console.log('pdf-parse successful:', characterCount, 'characters');
      } catch (pdfParseError) {
        console.error('pdf-parse failed:', pdfParseError);
        
        // Method 2: Fallback to pdfjs-dist
        console.log('Trying pdfjs-dist as fallback');
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        
        const numPages = pdf.numPages;
        const textContents = [];
        
        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map((item: any) => item.str || '');
          textContents.push(strings.join(' '));
        }
        
        textContent = textContents.join('\n');
        characterCount = textContent.length;
        console.log('pdfjs-dist successful:', characterCount, 'characters');
      }
      
      // Return the extracted text content
      return NextResponse.json({
        text: textContent,
        characterCount,
        originalName: file.name
      });
      
    } catch (pdfError) {
      console.error('All PDF parsing methods failed:', pdfError);
      return NextResponse.json({
        error: 'PDF parsing error',
        details: pdfError instanceof Error ? pdfError.message : 'Unknown error'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('PDF conversion error:', error);
    return NextResponse.json(
      { error: 'An error occurred during PDF conversion', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}