// app/api/files/[id]/content/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const fileId = params.id;
  
  if (!fileId) {
    return NextResponse.json({ 
      error: 'File ID is required', 
      content: '' 
    }, { status: 400 });
  }
  
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ 
      error: 'Unauthorized', 
      content: '' 
    }, { status: 401 });
  }
  
  try {
    // First, get the file record to verify ownership and get file details
    const { data: fileRecord, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single();
    
    if (fileError || !fileRecord) {
      return NextResponse.json(
        { 
          error: 'File not found or you do not have permission to access it',
          content: '' 
        },
        { status: 404 }
      );
    }
    
    try {
      // Get the text content directly from the file_path
      // Since we're storing only text now, this is simpler
      const { data: textData, error: textError } = await supabase.storage
        .from('files')
        .download(fileRecord.file_path);
      
      if (textError) {
        console.error('Error downloading text content:', textError);
        return NextResponse.json({ 
          error: 'Failed to retrieve text content',
          content: '[Content could not be retrieved]' 
        }, { status: 500 });
      }
      
      // Convert the text file data to string
      try {
        const content = await textData.text();
        return NextResponse.json({ content });
      } catch (textConversionError) {
        console.error('Error converting to text:', textConversionError);
        return NextResponse.json({ 
          error: 'Error converting text file',
          content: '[Text conversion failed]' 
        });
      }
    } catch (storageError) {
      console.error('Storage error:', storageError);
      return NextResponse.json({ 
        error: 'Storage operation failed',
        content: '[Storage error]' 
      });
    }
    
  } catch (error) {
    console.error('Error retrieving file content:', error);
    return NextResponse.json(
      { 
        error: 'An error occurred while retrieving file content',
        content: '[Error retrieving content]'
      },
      { status: 500 }
    );
  }
}