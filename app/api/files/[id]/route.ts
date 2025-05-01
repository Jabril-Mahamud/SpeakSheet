// app/api/files/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function DELETE(
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
    // First, get the file record to verify ownership and get file path
    const { data: fileRecord, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single();
    
    if (fileError || !fileRecord) {
      return NextResponse.json(
        { error: 'File not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }
    
    // Delete the text file from storage
    const { error: deleteError } = await supabase.storage
      .from('files')
      .remove([fileRecord.file_path]);
    
    if (deleteError) {
      console.error('Error deleting text file:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete text file' },
        { status: 500 }
      );
    }
    
    // Delete the file record from the database
    const { error: dbDeleteError } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId);
    
    if (dbDeleteError) {
      console.error('Error deleting file record:', dbDeleteError);
      return NextResponse.json(
        { error: 'Failed to delete file record' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ message: 'File deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'An error occurred while deleting the file' },
      { status: 500 }
    );
  }
}