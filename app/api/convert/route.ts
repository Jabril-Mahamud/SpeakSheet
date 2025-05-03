// app/api/convert/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import pdfParse from 'pdf-parse';

// Add console logging to debug when route is hit
console.log('Convert API route loaded');

export async function POST(request: NextRequest) {
  console.log('Convert API route called');
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
    
    console.log('File received:', file?.name);
   
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
   
    // Check if file is PDF
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }
   
    // Convert file to buffer for processing
    const buffer = await file.arrayBuffer();
    const nodeBuffer = Buffer.from(buffer);
    console.log('Buffer created, size:', nodeBuffer.length);
   
    try {
      // Use pdf-parse to extract text
      console.log('Starting PDF parsing');
      const data = await pdfParse(nodeBuffer);
      console.log('PDF parsed successfully');
     
      // Extract and clean up text
      const textContent = data.text
        .replace(/\r\n/g, '\n')
        .replace(/([a-z])- ([a-z])/g, '$1$2')
        .replace(/\s{2,}/g, ' ')
        .trim();
     
      // Count characters
      const characterCount = textContent.length;
      console.log('Extracted text with', characterCount, 'characters');
     
      // Return the extracted text content
      return NextResponse.json({
        text: textContent,
        characterCount,
        originalName: file.name
      });
     
    } catch (pdfError) {
      console.error('Error parsing PDF:', pdfError);
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