// app/api/files/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
// Correct import for pdf2json
import PdfParser from 'pdf2json';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
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
    
    // First, get a list of existing files to check for duplicates
    const { data: existingFiles, error: listError } = await supabase
      .from('files')
      .select('original_name')
      .eq('user_id', user.id);
      
    if (listError) {
      console.error('Error fetching existing files:', listError);
      // Continue anyway, just won't have duplicate detection
    }
    
    // Create a map of filenames and their counts
    const filenameCounts: Record<string, number> = {};
    
    // Populate the map with existing files
    if (existingFiles) {
      existingFiles.forEach(file => {
        // Get the basename without extension
        const baseName = file.original_name.split('.')[0];
        if (filenameCounts[baseName]) {
          filenameCounts[baseName]++;
        } else {
          filenameCounts[baseName] = 1;
        }
      });
    }
    
    for (const file of files) {
      try {
        const fileId = uuidv4();
        const originalName = file.name;
        const fileType = file.type;
        
        // Get file basename (without extension)
        const baseName = originalName.split('.')[0];
        
        // Extract the file extension for processing
        const fileExtension = originalName.split('.').pop()?.toLowerCase() || '';
        const allowedExtensions = ['pdf', 'txt'];
        
        if (!allowedExtensions.includes(fileExtension)) {
          errors.push(`Unsupported file type: ${fileExtension}. Only PDF and TXT files are supported currently.`);
          continue;
        }
        
        // Determine if we need a numbered filename
        if (!filenameCounts[baseName]) {
          filenameCounts[baseName] = 1;
        } else {
          filenameCounts[baseName]++;
        }
        
        // Create numbered filename if it's a duplicate
        const count = filenameCounts[baseName];
        const displayName = count > 1 ? `${baseName}-${count}` : baseName;
        
        // Convert file to buffer for processing
        const buffer = await file.arrayBuffer();
        
        // Extract text from the file
        let textContent = '';
        let characterCount = 0;
        
        if (fileExtension === 'pdf') {
          try {
            const tempDir = os.tmpdir();
            const tempPdfPath = path.join(tempDir, `${fileId}_temp.pdf`);
            
            // Write the buffer to a temporary file
            fs.writeFileSync(tempPdfPath, Buffer.from(buffer));
            
            // Create a promise wrapper for pdf2json
            const extractPdfText = () => {
              return new Promise<string>((resolve, reject) => {
                // Create PdfParser instance correctly
                const pdfParser = new PdfParser();
                
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
                    
                    resolve(text.trim());
                  } catch (err) {
                    console.error('Error processing PDF data:', err);
                    reject(new Error('Error extracting text from PDF'));
                  }
                });
                
                // Load and parse the PDF file
                pdfParser.loadPDF(tempPdfPath);
              });
            };
            
            // Extract the text
            textContent = await extractPdfText();
            
            // Clean up the temporary file
            fs.unlinkSync(tempPdfPath);
            
            // If text extraction failed but didn't throw an error
            if (!textContent || textContent.trim() === '') {
              textContent = '[PDF text extraction failed - The PDF may be scanned or contain only images]';
            }
            
          } catch (pdfError) {
            console.error('Error parsing PDF:', pdfError);
            textContent = '[PDF parsing error - The PDF may be encrypted or corrupted]';
          }
        } else if (fileExtension === 'txt') {
          // For text files, directly convert buffer to string
          textContent = new TextDecoder().decode(buffer);
        }
        
        // Count characters after extraction
        characterCount = textContent.length;
        
        // Use the display name for storage
        const textFilePath = `${user.id}/${displayName}.txt`;
        
        // Save ONLY the text content to storage
        const { error: textUploadError } = await supabase.storage
          .from('files')
          .upload(textFilePath, textContent);
        
        if (textUploadError) {
          console.error('Error uploading text content:', textUploadError);
          errors.push(`Failed to save text content for ${originalName}: ${textUploadError.message}`);
          continue; // Skip if we can't save the text content
        }
        
        // Store file metadata in the database - note that file_path now points to the text file
        const { error: dbError } = await supabase.from('files').insert({
          id: fileId,
          user_id: user.id,
          file_path: textFilePath,  // Points to the text file with the display name
          file_type: 'text/plain',  // Always text/plain since we only store text
          original_name: originalName,  // Keep original name for reference
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