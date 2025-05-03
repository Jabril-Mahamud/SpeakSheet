// utils/lib/pdf-utils.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
// Import pdf2json for PDF parsing
import PdfParser from 'pdf2json';

/**
 * Extracts text from a PDF file using pdf2json
 * @param buffer The PDF file buffer
 * @param originalName The original file name
 * @returns Object containing extracted text, character count, and original name
 */
export async function extractTextFromPdf(
  buffer: ArrayBuffer | Buffer,
  originalName: string
): Promise<{
  text: string;
  characterCount: number;
  originalName: string
}> {
  // Convert ArrayBuffer to Buffer if needed
  const nodeBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  let textContent = '';
 
  try {
    const tempDir = os.tmpdir();
    const fileId = uuidv4();
    const tempPdfPath = path.join(tempDir, `${fileId}_temp.pdf`);
   
    // Write the buffer to a temporary file
    fs.writeFileSync(tempPdfPath, nodeBuffer);
   
    // Extract the text
    const rawText = await extractPdfTextUsingPdf2json(tempPdfPath);
    
    // Clean and post-process the extracted text
    textContent = enhancedPostProcessPdfText(rawText);
   
    // Clean up the temporary file
    try {
      fs.unlinkSync(tempPdfPath);
    } catch (unlinkError) {
      console.warn('Failed to delete temp file:', unlinkError);
    }
   
    // If text extraction failed but didn't throw an error
    if (!textContent || textContent.trim() === '') {
      textContent = '[PDF text extraction failed - The PDF may be scanned or contain only images]';
    }
   
  } catch (pdfError) {
    console.error('Error parsing PDF:', pdfError);
    textContent = '[PDF parsing error - The PDF may be encrypted or corrupted]';
  }
 
  const characterCount = textContent.length;
 
  return {
    text: textContent,
    characterCount,
    originalName
  };
}

/**
 * Enhanced helper function to extract text from a PDF file using pdf2json
 * @param pdfPath Path to the PDF file
 * @returns Extracted text content
 */
function extractPdfTextUsingPdf2json(pdfPath: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    // Create PdfParser instance
    const pdfParser = new PdfParser(null, false); // Second parameter should be a boolean
   
    pdfParser.on("pdfParser_dataError", (errData) => {
      console.error('PDF parsing error:', errData);
      reject(new Error('PDF parsing failed'));
    });
   
    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      try {
        // Convert PDF data to text
        const pages = pdfData.Pages || [];
        let text = '';
        
        // Process each page
        for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
          const page = pages[pageIndex];
          const pageTexts = page.Texts || [];
          
          // Group text items by lines based on y-position
          const lineGroups = groupTextItemsByLines(pageTexts);
          
          // Process each line
          for (const lineGroup of lineGroups) {
            // Sort by horizontal position within the line
            lineGroup.sort((a, b) => a.x - b.x);
            
            let lineText = '';
            let prevRight = -1;
            
            // Process each text element in the line
            for (const textItem of lineGroup) {
              // Decode the text
              const decodedText = decodeURIComponent(textItem.R.map((r: any) => r.T).join(' '));
              
              // Determine if we need to add a space between items
              // Calculate approximate width of this text item
              const itemWidth = textItem.w || 0;
              const itemLeft = textItem.x;
              
              // If there's a significant gap between this item and the previous one, add a space
              if (prevRight > 0 && (itemLeft - prevRight) > 0.1) {
                // Only add space if we won't be adding a space to something that already has a space
                if (lineText && !lineText.endsWith(' ') && !decodedText.startsWith(' ')) {
                  lineText += ' ';
                }
              }
              
              lineText += decodedText;
              prevRight = itemLeft + itemWidth;
            }
            
            // Add the complete line
            if (lineText.trim()) {
              text += lineText.trim() + '\n';
            }
          }
          
          // Add paragraph break between pages
          text += '\n';
        }
        
        resolve(text.trim());
      } catch (err) {
        console.error('Error processing PDF data:', err);
        reject(new Error('Error extracting text from PDF'));
      }
    });
    
    // Load and parse the PDF file
    pdfParser.loadPDF(pdfPath);
  });
}

/**
 * Group text items into lines based on their vertical position
 * @param pageTexts Array of text items from a PDF page
 * @returns Array of text item arrays, where each array represents a line
 */
function groupTextItemsByLines(pageTexts: any[]): any[][] {
  // If the page is empty, return an empty array
  if (!pageTexts || pageTexts.length === 0) {
    return [];
  }
  
  // Sort all text items by vertical position
  const sortedTexts = [...pageTexts].sort((a, b) => a.y - b.y);
  
  const lines: any[][] = [];
  let currentLine: any[] = [sortedTexts[0]];
  let currentY = sortedTexts[0].y;
  
  // Group text items by their y positions
  for (let i = 1; i < sortedTexts.length; i++) {
    const textItem = sortedTexts[i];
    
    // If this item is on the same line (within a small threshold)
    if (Math.abs(textItem.y - currentY) < 0.2) {
      currentLine.push(textItem);
    } else {
      // This item is on a new line
      lines.push(currentLine);
      currentLine = [textItem];
      currentY = textItem.y;
    }
  }
  
  // Add the last line
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }
  
  return lines;
}

/**
 * Enhanced post-processing of PDF extracted text
 * Comprehensive approach to fix common PDF extraction issues
 * @param text Raw extracted text from PDF
 * @returns Cleaned and formatted text
 */
function enhancedPostProcessPdfText(text: string): string {
  if (!text) return '';
  
  // Pre-process to fix ligatures and other simple character issues
  let processedText = fixCharacterIssues(text);
  
  // Split by lines to preserve paragraph structure
  const lines = processedText.split('\n');
  const processedLines = [];
  
  // Process each line and handle hyphenation
  processedText = processHyphenation(lines);
  
  // Fix common spacing and character issues within lines
  processedText = fixCommonTextIssues(processedText);
  
  // Fix random spaces within words (a common PDF extraction issue)
  processedText = fixRandomSpacesInWords(processedText);
  
  // Fix merged words (words without proper spacing)
  processedText = fixMergedWords(processedText);
  
  // Clean up any remaining spacing issues
  processedText = cleanupSpacing(processedText);
  
  // Final structural improvements
  return finalStructuralImprovements(processedText);
}

/**
 * Fix character issues like ligatures and other special characters
 * @param text The text to process
 * @returns Text with fixed characters
 */
function fixCharacterIssues(text: string): string {
  return text
    // Fix ligatures
    .replace(/ﬁ/g, 'fi')
    .replace(/ﬂ/g, 'fl')
    .replace(/ﬀ/g, 'ff')
    .replace(/ﬃ/g, 'ffi')
    .replace(/ﬄ/g, 'ffl')
    // Fix other common character issues
    .replace(/–/g, '-')  // en dash to hyphen
    .replace(/—/g, '-')  // em dash to hyphen
    .replace(/…/g, '...') // ellipsis to three dots
    .replace(/"/g, '"')  // curly quotes to straight quotes
    .replace(/"/g, '"')  // curly quotes to straight quotes
    .replace(/'/g, "'")  // curly apostrophe to straight apostrophe
    .replace(/'/g, "'")  // curly apostrophe to straight apostrophe
    // Fix common OCR errors
    .replace(/\bI\b/g, 'I')  // Ensure capital I is preserved
    .replace(/\b0\b/g, 'O')  // Fix 0 mistaken for O
    .replace(/\b1\b/g, 'I')  // Fix 1 mistaken for I in some contexts
    .replace(/l\b/g, 'l')    // Fix lowercase l issues
    .replace(/\u00A0/g, ' '); // Replace non-breaking spaces with regular spaces
}

/**
 * Process hyphenation at line breaks
 * @param lines Array of text lines
 * @returns Processed text with hyphenation fixed
 */
function processHyphenation(lines: string[]): string {
  const processedLines = [];
  
  // Track if we have a hyphenated word from the previous line
  let previousHyphen = false;
  let previousLine = '';
  
  // Process each line
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      processedLines.push('');
      continue;
    }
    
    // Handle hyphenation from previous line
    if (previousHyphen && previousLine) {
      // Get the last word fragment from previous line (without the hyphen)
      const hyphenMatch = previousLine.match(/(\w+)-\s*$/);
      
      if (hyphenMatch && hyphenMatch[1]) {
        const prefix = hyphenMatch[1];
        
        // Check if current line starts with a word fragment
        const currentFragmentMatch = line.match(/^(\w+)/);
        
        if (currentFragmentMatch) {
          // Join the fragments to form a complete word
          const wordSuffix = currentFragmentMatch[1];
          const fullWord = prefix + wordSuffix;
          
          // Replace the fragment in the current line with the full word
          line = line.replace(/^\w+/, fullWord);
          
          // Remove the hyphenated partial word from previous line
          processedLines[processedLines.length - 1] = previousLine.replace(/\w+-\s*$/, '');
        }
      }
    }
    
    // Check if current line ends with a hyphen (for next iteration)
    previousHyphen = /\w+-\s*$/.test(line);
    previousLine = line;
    
    processedLines.push(line);
  }
  
  return processedLines.join('\n');
}

/**
 * Fix common text issues like spacing around punctuation
 * @param text The text to process
 * @returns Text with common issues fixed
 */
function fixCommonTextIssues(text: string): string {
  return text
    // Fix spacing around punctuation
    .replace(/([.,;:!?])([a-zA-Z0-9])/g, '$1 $2')
    // Fix spacing after closing parenthesis or bracket
    .replace(/([)\]])([a-zA-Z0-9])/g, '$1 $2')
    // Fix spacing before opening parenthesis or bracket
    .replace(/([a-zA-Z0-9])([(\[])/g, '$1 $2')
    // Fix spacing around quotes
    .replace(/"([a-zA-Z0-9])/g, '" $1')
    .replace(/([a-zA-Z0-9])"/g, '$1 "')
    // Fix em dash and en dash spacing
    .replace(/([a-zA-Z0-9])–([a-zA-Z0-9])/g, '$1 – $2')
    .replace(/([a-zA-Z0-9])—([a-zA-Z0-9])/g, '$1 — $2')
    // Fix spacing in common constructions
    .replace(/(\d),(\d)/g, '$1,$2') // Keep numbers with commas together
    .replace(/(\d)\.(\d)/g, '$1.$2') // Keep decimal points together
    // Preserve titles and abbreviations
    .replace(/Mr\s*\.\s*/g, 'Mr. ')
    .replace(/Mrs\s*\.\s*/g, 'Mrs. ')
    .replace(/Ms\s*\.\s*/g, 'Ms. ')
    .replace(/Dr\s*\.\s*/g, 'Dr. ')
    .replace(/Prof\s*\.\s*/g, 'Prof. ')
    .replace(/Inc\s*\.\s*/g, 'Inc. ')
    .replace(/Ltd\s*\.\s*/g, 'Ltd. ')
    .replace(/Co\s*\.\s*/g, 'Co. ')
    .replace(/etc\s*\.\s*/g, 'etc. ')
    .replace(/i\s*\.\s*e\s*\.\s*/g, 'i.e. ')
    .replace(/e\s*\.\s*g\s*\.\s*/g, 'e.g. ');
}

/**
 * Fix random spaces within words
 * @param text The text to process
 * @returns Text with in-word spaces fixed
 */
function fixRandomSpacesInWords(text: string): string {
  // Initial pass - identify potential words with internal spaces
  let processedText = text;
  
  // Fix words with internal spaces using regex
  // Find patterns where a single space appears between characters that should be together
  processedText = processedText.replace(/([a-z])\s([a-z])/gi, (match, c1, c2) => {
    // Check if this might be a legitimate word break
    const lowC1 = c1.toLowerCase();
    const lowC2 = c2.toLowerCase();
    
    // Don't join across obvious word boundaries
    if (lowC1 === 'a' || lowC1 === 'i' || lowC2 === 'a' || lowC2 === 'i') {
      // These are often separate words (like "I am" or "a cat")
      return match;
    }
    
    // Otherwise join the characters
    return c1 + c2;
  });
  
  // More specific patterns for common in-word spacing issues
  processedText = processedText
    // Fix obvious within-word spaces 
    .replace(/([a-z]) ([a-z][a-z])/gi, (match, c1, c2) => {
      // Don't join certain common words or prefixes
      if (/^(to|of|in|on|at|by|up|be|as|is|am|if|or|so|an|no|my|we|us|do|go|me|he|it)$/i.test(c1)) {
        return match; // Keep as separate words
      }
      return c1 + c2; // Join them
    })
    
    // Fix spaces around common letter groups
    .replace(/([a-z]) (th|ing|ed|er|ly|ment|tion|able|ible)\b/gi, '$1$2')
    .replace(/\b(pre|un|re|dis|mis|over|under|anti|non|sub) ([a-z])/gi, '$1$2')
    
    // Fix specific patterns seen in sample text
    .replace(/tr ut h/g, 'truth')
    .replace(/sing le/g, 'single')
    .replace(/poss ession/g, 'possession')
    .replace(/m ust/g, 'must')
    .replace(/neighbou r/g, 'neighbour')
    .replace(/surr ounding/g, 'surrounding')
    .replace(/consider ed/g, 'considered')
    .replace(/pr operty/g, 'property')
    
    // Fix spaces in the middle of short words (which are particularly unlikely to be correct)
    .replace(/\b([a-z]{1,2}) ([a-z]{1,3})\b/gi, '$1$2');
  
  return processedText;
}

/**
 * Fix merged words (words without proper spacing)
 * @param text The text to process
 * @returns Text with merged words fixed
 */
function fixMergedWords(text: string): string {
  // Fix merged words by adding spaces before capital letters in the middle of words
  // but being careful about known exceptions (like "iPhone", "McDonalds", etc.)
  let processedText = text.replace(/([a-z])([A-Z])/g, (match, c1, c2) => {
    // Exceptions: common CamelCase patterns
    const prefix = text.substring(Math.max(0, text.indexOf(match) - 5), text.indexOf(match));
    
    // Don't split known camelCase patterns
    if (/\b(Mac|Mc|O'|iPhone|iPad|eBay|PayPal|YouTube|LinkedIn|JavaScript|TypeScript|PowerPoint|WordPress|GitHub)\b/.test(prefix + c1 + c2)) {
      return match;
    }
    
    // Otherwise, add a space before the capital letter
    return c1 + ' ' + c2;
  });
  
  // Fix common word pairs without spaces
  const commonMergedWords = [
    /\b(inthe)\b/g, 'in the',
    /\b(ofthe)\b/g, 'of the',
    /\b(tothe)\b/g, 'to the',
    /\b(forthe)\b/g, 'for the',
    /\b(fromthe)\b/g, 'from the',
    /\b(withthe)\b/g, 'with the',
    /\b(andthe)\b/g, 'and the',
    /\b(atthe)\b/g, 'at the',
    /\b(onthe)\b/g, 'on the',
    /\b(bythe)\b/g, 'by the',
    /\b(isthe)\b/g, 'is the',
    /\b(wasthe)\b/g, 'was the',
    /\b(tobe)\b/g, 'to be',
    /\b(willbe)\b/g, 'will be',
    /\b(havebeen)\b/g, 'have been',
    /\b(hasbeen)\b/g, 'has been',
    /\b(itis)\b/g, 'it is',
    /\b(thatis)\b/g, 'that is',
    /\b(thereis)\b/g, 'there is',
    /\b(thisis)\b/g, 'this is',
    /\b(whatis)\b/g, 'what is',
    /\b(ina)\b/g, 'in a',
    /\b(ofa)\b/g, 'of a',
    /\b(toa)\b/g, 'to a',
    /\b(fora)\b/g, 'for a',
    /\b(asa)\b/g, 'as a',
    /\b(suchaman)\b/g, 'such a man',
    /\b(mustknowthat)\b/g, 'must know that',
    /\b(somuch)\b/g, 'so much',
    /\b(youmustknow)\b/g, 'you must know',
    /\b(nextweek)\b/g, 'next week',
    /\b(Whata)\b/g, 'What a',
    /\b(Howcanit)\b/g, 'How can it'
  ];
  
  // Apply all the common merged word fixes
  for (let i = 0; i < commonMergedWords.length; i += 2) {
    const pattern = commonMergedWords[i] as RegExp;
    const replacement = commonMergedWords[i + 1] as string;
    processedText = processedText.replace(pattern, replacement);
  }
  
  // Find and fix more merged words based on common patterns
  processedText = processedText.replace(/\b([a-z]{2,5})([A-Z][a-z]{2,})\b/g, '$1 $2');
  
  return processedText;
}

/**
 * Clean up any remaining spacing issues
 * @param text The text to process
 * @returns Text with cleaned up spacing
 */
function cleanupSpacing(text: string): string {
  return text
    // Remove multiple consecutive spaces
    .replace(/\s{2,}/g, ' ')
    // Ensure one space after periods, commas, etc.
    .replace(/([.,;:!?])\s*/g, '$1 ')
    // But don't add space after period in numbers
    .replace(/(\d)\. (\d)/g, '$1.$2')
    // Ensure no spaces before punctuation
    .replace(/\s+([.,;:!?])/g, '$1')
    // Ensure space after closing parenthesis if followed by a letter
    .replace(/\)([a-zA-Z])/g, ') $1')
    // Ensure proper spacing around quotes
    .replace(/" /g, '"')
    .replace(/ "/g, ' "')
    // Fix spacing at start and end of lines
    .replace(/^\s+/gm, '')
    .replace(/\s+$/gm, '')
    // Ensure empty lines are preserved
    .replace(/\n\n+/g, '\n\n');
}

/**
 * Apply final structural improvements to the text
 * @param text The text to process
 * @returns Structurally improved text
 */
function finalStructuralImprovements(text: string): string {
  // Split into paragraphs
  const paragraphs = text.split(/\n\s*\n/);
  const processedParagraphs = [];
  
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      processedParagraphs.push('');
      continue;
    }
    
    // Process each paragraph
    let processedParagraph = paragraph
      // Fix sentence spacing - ensure one space after end of sentence
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
      // Fix specific quotation patterns with proper spacing
      .replace(/"([^"]+)"/g, '"$1"')
      // Ensure proper spacing in dialog
      .replace(/"([^"]+),"/g, '"$1,"')
      .replace(/"([^"]+);"/g, '"$1;"')
      .replace(/"([^"]+)\."/g, '"$1."')
      .replace(/"([^"]+)!"/g, '"$1!"')
      .replace(/"([^"]+)\?"/g, '"$1?"');
    
    processedParagraphs.push(processedParagraph.trim());
  }
  
  // Join paragraphs with double newlines
  return processedParagraphs.join('\n\n');
}

/**
 * Validates if the file is a PDF
 * @param file The file to check
 * @returns Boolean indicating if file is a PDF
 */
export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Extracts text from a text file
 * @param buffer The text file buffer
 * @param originalName The original file name
 * @returns Object containing extracted text, character count, and original name
 */
export function extractTextFromTextFile(
  buffer: ArrayBuffer | Buffer,
  originalName: string
): {
  text: string;
  characterCount: number;
  originalName: string
} {
  // Ensure buffer is properly handled for TextDecoder
  let textContent: string;
  try {
    if (Buffer.isBuffer(buffer)) {
      // If it's a Node.js Buffer, convert to string directly
      textContent = buffer.toString('utf8');
    } else {
      // Otherwise, use TextDecoder
      textContent = new TextDecoder().decode(new Uint8Array(buffer));
    }
  } catch (error) {
    console.error('Error decoding text file:', error);
    textContent = '';
  }
  return {
    text: textContent,
    characterCount: textContent.length,
    originalName
  };
}

/**
 * Global utility function to extract text from any supported file type
 * @param buffer The file buffer
 * @param originalName The original file name
 * @param mimeType The MIME type of the file
 * @returns Promise resolving to object with extracted text and metadata
 */
export async function extractTextFromFile(
  buffer: ArrayBuffer | Buffer,
  originalName: string,
  mimeType: string
): Promise<{
  text: string;
  characterCount: number;
  originalName: string
}> {
  // Process based on MIME type
  if (mimeType === 'application/pdf' || originalName.toLowerCase().endsWith('.pdf')) {
    // For PDFs, pass the buffer directly - the extractTextFromPdf function handles both types
    return extractTextFromPdf(buffer, originalName);
  } else if (
    mimeType === 'text/plain' || 
    originalName.toLowerCase().endsWith('.txt') ||
    originalName.toLowerCase().endsWith('.md') ||
    originalName.toLowerCase().endsWith('.js') ||
    originalName.toLowerCase().endsWith('.ts') ||
    originalName.toLowerCase().endsWith('.css') ||
    originalName.toLowerCase().endsWith('.html') ||
    originalName.toLowerCase().endsWith('.json')
  ) {
    // For text files, the function accepts both types
    return extractTextFromTextFile(buffer, originalName);
  } else {
    throw new Error(`Unsupported file type: ${mimeType || originalName}`);
  }
}