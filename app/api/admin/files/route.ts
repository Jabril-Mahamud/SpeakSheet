import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    // Verify admin status
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all files and users
    const [filesResult, usersResult] = await Promise.all([
      supabase.from('files').select('*').order('created_at', { ascending: false }),
      supabase.from('users').select('id, email')
    ]);

    if (filesResult.error) throw filesResult.error;
    if (usersResult.error) throw usersResult.error;

    // Create a user lookup map
    const userMap = new Map(
      usersResult.data.map(user => [user.id, user.email?.split('@')[0] || 'Unknown'])
    );

    // Format file data
    const files = filesResult.data.map(file => ({
      id: file.id,
      name: file.original_name,
      user: userMap.get(file.user_id) || 'Unknown',
      status: file.conversion_status || 'processing',
      createdAt: file.created_at,
      size: formatFileSize(file.character_count || 0)
    }));

    // Calculate success rate
    const completedFiles = files.filter(f => f.status === 'completed').length;
    const successRate = files.length > 0 
      ? Math.round((completedFiles / files.length) * 100) 
      : 0;

    return NextResponse.json({
      files,
      totalFiles: files.length,
      successRate
    });

  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}

// Helper function to format file size
function formatFileSize(characters: number): string {
  if (characters < 1000) return `${characters} chars`;
  if (characters < 1000000) return `${(characters / 1000).toFixed(1)}K chars`;
  return `${(characters / 1000000).toFixed(1)}M chars`;
}

// Handler for deleting files
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    // Extract file ID from the URL
    const fileId = request.nextUrl.searchParams.get('id');
    if (!fileId) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 });
    }

    // Verify admin status
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Delete the file
    const { error } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}