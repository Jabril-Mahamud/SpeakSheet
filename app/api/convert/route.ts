// app/api/convert/pdf-to-text/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import pdfParse from 'pdf-parse';

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
    
    // Check if file is PDF
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }
    
    // Convert file to buffer for processing
    const buffer = await file.arrayBuffer();
    const nodeBuffer = Buffer.from(buffer);
    
    try {
      // Use pdf-parse to extract text
      const data = await pdfParse(nodeBuffer);
      
      // Get text content and clean it up a bit
      const textContent = data.text
        .replace(/\r\n/g, '\n') // Normalize line endings
        .replace(/([a-z])- ([a-z])/g, '$1$2') // Fix hyphenated words
        .replace(/\s{2,}/g, ' ') // Remove multiple spaces
        .trim();
      
      // Count characters
      const characterCount = textContent.length;
      
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