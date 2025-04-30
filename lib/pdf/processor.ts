// lib/pdf/processor.ts
import { createClient } from '@/utils/supabase/server';
import * as pdfjs from 'pdfjs-dist';

// Fix: Remove top-level await and use a function to initialize the worker
function initPDFWorker() {
  // Only load worker in browser environment
  if (typeof window !== 'undefined') {
    // Dynamic import instead of await
    import('pdfjs-dist/build/pdf.worker.mjs').then((workerModule) => {
      pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
    });
  }
}

export async function extractTextFromPDF(fileBuffer: ArrayBuffer): Promise<string> {
  try {
    // Initialize worker before processing
    initPDFWorker();
    
    const loadingTask = pdfjs.getDocument({ data: fileBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n\n';
    }
    
    return fullText;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

export async function processPDFFile(
  fileId: string, 
  userId: string
): Promise<{ text: string; characterCount: number }> {
  const supabase = await createClient();
  
  // Get file information
  const { data: fileData, error: fileError } = await supabase
    .from('files')
    .select('file_path')
    .eq('id', fileId)
    .eq('user_id', userId)
    .single();
    
  if (fileError || !fileData) {
    throw new Error('File not found or access denied');
  }
  
  // Download the file from storage
  const { data: fileBuffer, error: downloadError } = await supabase.storage
    .from('files')
    .download(fileData.file_path);
    
  if (downloadError || !fileBuffer) {
    throw new Error('Failed to download file');
  }
  
  // Extract text
  const text = await extractTextFromPDF(await fileBuffer.arrayBuffer());
  
  // Update the character count
  await supabase
    .from('files')
    .update({ character_count: text.length })
    .eq('id', fileId);
    
  return {
    text,
    characterCount: text.length
  };
}