// app/api/files/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Fetch files from the database
    const { data: files, error } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching files:', error);
      return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
    }
    
    return NextResponse.json({ files: files || [] });
  } catch (error) {
    console.error('Error in files API:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching files', files: [] },
      { status: 500 }
    );
  }
}