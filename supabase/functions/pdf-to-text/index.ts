// supabase/functions/pdf-to-text/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { v4 as uuidv4 } from "https://esm.sh/uuid@9.0.0";

// PDF parsing library for Deno
import * as pdfjs from "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/+esm";

// Initialize PDF.js worker
const pdfjsWorker = await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js");
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

serve(async (req) => {
  // Enable CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // Handle only POST requests for PDF processing
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  try {
    // Get environment variables from Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    console.log("Starting PDF extraction process");

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get file data from request
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;

    if (!file || !userId) {
      return new Response(
        JSON.stringify({ error: "File and userId are required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    console.log(`Processing PDF: ${file.name} (${file.size} bytes) for user ${userId}`);

    // Check if file is PDF
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return new Response(
        JSON.stringify({ error: "Only PDF files are supported" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    console.log(`File converted to ArrayBuffer (${arrayBuffer.byteLength} bytes)`);

    // Extract text from PDF
    let text = "";
    let pageCount = 0;
    try {
      // Load PDF document
      console.log("Loading PDF document with PDF.js");
      const loadingTask = pdfjs.getDocument({ 
        data: new Uint8Array(arrayBuffer),
        // Disable worker for Deno environment
        disableWorker: true,
        // Improve text extraction settings
        cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/",
        cMapPacked: true,
      });
      const pdfDocument = await loadingTask.promise;
      pageCount = pdfDocument.numPages;
      console.log(`PDF has ${pageCount} pages`);

      // Extract text from each page with improved layout preservation
      for (let i = 1; i <= pageCount; i++) {
        console.log(`Processing page ${i}/${pageCount}`);
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent({
          normalizeWhitespace: true,
          disableCombineTextItems: false,
        });

        // Process text with better layout preservation
        let lastY = null;
        let pageText = "";
        let textChunk = "";

        // Process text items with improved block detection
        for (const item of textContent.items) {
          if ("str" in item) {
            // Handle new lines/paragraphs based on vertical position
            if (lastY !== null && Math.abs(item.transform[5] - lastY) > 12) {
              pageText += textChunk.trim() + "\n\n"; // Double newline for paragraphs
              textChunk = "";
            } else if (textChunk.length > 0 && !textChunk.endsWith(" ")) {
              textChunk += " "; // Add space between words on same line
            }
            textChunk += item.str;
            lastY = item.transform[5];
          }
        }
        
        if (textChunk.trim().length > 0) {
          pageText += textChunk.trim();
        }

        // Add page marker and text
        text += `\n\n-- Page ${i} --\n\n${pageText}\n`;
      }

      // Clean up the text
      text = text
        .replace(/\n{3,}/g, "\n\n") // Replace excessive newlines
        .trim();
      
      console.log(`Extracted ${text.length} characters from PDF`);
    } catch (err) {
      console.error("PDF parse error:", err);
      text = `[PDF parsing error: ${err instanceof Error ? err.message : String(err)}]\n\n${text}`;
    }

    // If no text was extracted, set a helpful message
    if (text.trim().length === 0) {
      text = "[PDF text extraction failed: This may be an image-only or scanned document without text content]";
    }

    // Generate unique ID for the file
    const fileId = uuidv4();
    const originalName = file.name;
    const characterCount = text.length;

    // Create a clean display name without extension
    const baseName = originalName.substring(0, originalName.lastIndexOf('.'));
    const displayName = baseName || 'unnamed';

    // Store text content in storage
    const textFilePath = `${userId}/${displayName}-${fileId}.txt`;
    console.log(`Uploading text to storage: ${textFilePath}`);
    
    const { error: storageError } = await supabase.storage
      .from('files')
      .upload(textFilePath, text);

    if (storageError) {
      console.error('Error uploading text content:', storageError);
      return new Response(
        JSON.stringify({ error: `Failed to save text content: ${storageError.message}` }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Store file metadata in the database
    console.log(`Saving file metadata to database`);
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
      return new Response(
        JSON.stringify({ error: `Failed to save file metadata: ${dbError.message}` }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    console.log(`PDF processing completed successfully. File ID: ${fileId}`);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        fileId,
        textFilePath,
        pageCount,
        characterCount,
        message: `PDF successfully converted to text (${pageCount} pages, ${characterCount} characters)`
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error processing PDF:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to process PDF", 
        details: error instanceof Error ? error.message : String(error) 
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});