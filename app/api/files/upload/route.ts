// app/api/files/upload/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { checkSubscriptionStatus } from '@/lib/subscription';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check subscription
    const isSubscribed = await checkSubscriptionStatus(user.id);
    if (!isSubscribed) {
      return NextResponse.json({ error: 'Subscription required' }, { status: 403 });
    }
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }
    
    // Generate unique ID and storage path
    const fileId = uuidv4();
    const filePath = `${user.id}/${fileId}.pdf`;
    
    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from('files')
      .upload(filePath, await file.arrayBuffer(), {
        contentType: file.type
      });
      
    if (uploadError) {
      console.error('File upload error:', uploadError);
      return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
    }
    
    // Create file record in database
    const { error: dbError } = await supabase
      .from('files')
      .insert({
        id: fileId,
        user_id: user.id,
        file_path: filePath,
        file_type: file.type,
        original_name: file.name,
        conversion_status: 'uploaded'
      });
      
    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'Failed to create file record' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      fileId, 
      message: 'File uploaded successfully' 
    });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}