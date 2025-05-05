// app/api/files/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';

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
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
        const allowedExtensions = ['pdf', 'txt'];
        
        if (!allowedExtensions.includes(fileExtension)) {
          errors.push(`Unsupported file type: ${fileExtension}. Only PDF and TXT files are supported currently.`);
          continue;
        }
        
        if (fileExtension === 'pdf') {
          // For PDF files, use the Supabase Edge Function
          const fileId = await processPdfWithEdgeFunction(file, user.id);
          if (fileId) {
            fileIds.push(fileId);
          } else {
            errors.push(`Failed to process PDF: ${file.name}`);
          }
        } else if (fileExtension === 'txt') {
          // For text files, process directly
          const fileId = await processTextFile(file, user.id, supabase);
          if (fileId) {
            fileIds.push(fileId);
          } else {
            errors.push(`Failed to process text file: ${file.name}`);
          }
        }
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

// Process PDF files using the Supabase Edge Function
// Process PDF files using the Supabase Edge Function
async function processPdfWithEdgeFunction(file: File, userId: string): Promise<string | null> {
  try {
    // Create a form to send to the edge function
    const edgeFormData = new FormData();
    edgeFormData.append('file', file);
    edgeFormData.append('userId', userId);
    
    // Get the Supabase URL and construct the edge function URL correctly
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Missing Supabase URL environment variable');
    }
    
    // Log the URL we're using for debugging
    console.log(`Supabase URL from env: ${supabaseUrl}`);
    
    // Make sure the URL doesn't have trailing slashes and properly construct the edge function URL
    // Using the correct function name "pdf-to-text" that you deployed
    const baseUrl = supabaseUrl.replace(/\/$/, '');
    const edgeFunctionUrl = `${baseUrl}/functions/v1/pdf-to-text`;
    
    console.log(`Calling edge function at: ${edgeFunctionUrl}`);
    console.log(`Sending PDF to edge function: ${file.name} (${file.size} bytes)`);
    
    // Call the edge function
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      body: edgeFormData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: errorText };
      }
      console.error('Edge function error response:', errorData);
      throw new Error(errorData.error || `PDF processing failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`PDF processed successfully: ${file.name}, File ID: ${data.fileId}`);
    return data.fileId;
    
  } catch (error) {
    console.error('Error in PDF processing:', error);
    return null;
  }
}

// Process text files directly
async function processTextFile(file: File, userId: string, supabase: any): Promise<string | null> {
  try {
    const fileId = uuidv4();
    const originalName = file.name;
    
    // Get file content as text
    const text = await file.text();
    const characterCount = text.length;
    
    // Create a clean display name without extension
    const baseName = originalName.substring(0, originalName.lastIndexOf('.'));
    const displayName = baseName || 'unnamed';
    
    // Store the text content
    const textFilePath = `${userId}/${displayName}-${fileId}.txt`;
    
    console.log(`Uploading text file: ${originalName}`);
    
    const { error: textUploadError } = await supabase.storage
      .from('files')
      .upload(textFilePath, text);
    
    if (textUploadError) {
      console.error('Error uploading text content:', textUploadError);
      return null;
    }
    
    // Store file metadata in the database
    const { error: dbError } = await supabase.from('files').insert({
      id: fileId,
      user_id: userId,
      file_path: textFilePath,
      file_type: 'text/plain',
      original_name: originalName,
      character_count: characterCount,
      conversion_status: 'completed'
    });
    
    if (dbError) {
      console.error('Error saving file metadata:', dbError);
      return null;
    }
    
    console.log(`Text file processed successfully: ${originalName}, File ID: ${fileId}`);
    return fileId;
  } catch (error) {
    console.error('Error processing text file:', error);
    return null;
  }
}