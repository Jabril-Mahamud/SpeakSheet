// app/api/files/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const fileId = params.id;
  
  if (!fileId) {
    return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
  }
  
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Get the file details
    const { data: file, error } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single();
    
    if (error || !file) {
      return NextResponse.json(
        { error: 'File not found or you do not have permission to access it' },
        { status: 404 }
      );
    }
    
    // Generate a signed URL for the file
    const { data: urlData, error: urlError } = await supabase.storage
      .from('files')
      .createSignedUrl(file.file_path, 3600); // 1 hour expiry
    
    if (urlError) {
      return NextResponse.json(
        { error: 'Failed to generate audio URL' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      ...file,
      audioUrl: urlData.signedUrl
    });
    
  } catch (error) {
    console.error('Error retrieving file:', error);
    return NextResponse.json(
      { error: 'An error occurred while retrieving the file' },
      { status: 500 }
    );
  }
}