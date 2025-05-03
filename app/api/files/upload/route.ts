// app/api/files/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { cookies } from 'next/headers';
// Import the PDF utilities directly
import { extractTextFromPdf, extractTextFromTextFile } from '@/utils/lib/pdf-utils';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (!user || authError) {
    console.error('Authentication error:', authError);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Create a FormData instance
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }
    
    // Process each file
    const fileIds: string[] = [];
    const errors: string[] = [];
    
    for (const file of files) {
      try {
        const fileId = uuidv4();
        const originalName = file.name;
        
        // Extract the file extension for processing
        const fileExtension = originalName.split('.').pop()?.toLowerCase() || '';
        const allowedExtensions = ['pdf', 'txt'];
        
        if (!allowedExtensions.includes(fileExtension)) {
          errors.push(`Unsupported file type: ${fileExtension}. Only PDF and TXT files are supported currently.`);
          continue;
        }
        
        // Extract text content based on file type
        let textContent = '';
        let characterCount = 0;
        
        // Get file buffer
        const buffer = await file.arrayBuffer();
        
        if (fileExtension === 'pdf') {
          try {
            // Use the PDF utility directly instead of calling an API
            console.log('Processing PDF file:', originalName);
            const result = await extractTextFromPdf(buffer, originalName);
            textContent = result.text;
            characterCount = result.characterCount;
            
            if (!textContent || textContent.trim() === '') {
              throw new Error('PDF extraction produced empty content');
            }
          } catch (conversionError) {
            console.error('PDF conversion error:', conversionError);
            errors.push(`Failed to convert PDF: ${conversionError instanceof Error ? conversionError.message : 'Unknown error'}`);
            continue;
          }
        } else if (fileExtension === 'txt') {
          // For text files, use the text file utility
          const result = extractTextFromTextFile(buffer, originalName);
          textContent = result.text;
          characterCount = result.characterCount;
        }
        
        // Create a clean display name without extension
        const baseName = originalName.substring(0, originalName.lastIndexOf('.'));
        const displayName = baseName || 'unnamed';
        
        // Store the text content
        const textFilePath = `${user.id}/${displayName}-${fileId}.txt`;
        
        const { error: textUploadError } = await supabase.storage
          .from('files')
          .upload(textFilePath, textContent);
        
        if (textUploadError) {
          console.error('Error uploading text content:', textUploadError);
          errors.push(`Failed to save text content for ${originalName}: ${textUploadError.message}`);
          continue;
        }
        
        // Store file metadata in the database
        const { error: dbError } = await supabase.from('files').insert({
          id: fileId,
          user_id: user.id,
          file_path: textFilePath,
          file_type: 'text/plain',
          original_name: originalName,
          character_count: characterCount,
          conversion_status: 'completed'
        });
        
        if (dbError) {
          console.error('Error saving file metadata:', dbError);
          errors.push(`Failed to save metadata for ${originalName}: ${dbError.message}`);
          continue;
        }
        
        fileIds.push(fileId);
      } catch (fileError) {
        console.error('Error processing file:', fileError);
        errors.push(`Error processing ${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
      }
    }
    
    // Return appropriate response based on results
    if (fileIds.length > 0) {
      return NextResponse.json({
        message: `${fileIds.length} file(s) processed and text content saved successfully${errors.length > 0 ? ' with some errors' : ''}`,
        fileIds,
        errors: errors.length > 0 ? errors : undefined
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to process all files', errors },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: 'An error occurred during file processing', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}