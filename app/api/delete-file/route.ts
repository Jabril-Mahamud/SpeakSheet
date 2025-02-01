// app/api/delete-file/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
   
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { filePath, fileId } = await request.json()
   
    if (!filePath || !fileId) {
      return NextResponse.json({ error: 'Missing file path or ID' }, { status: 400 })
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('files')
      .remove([filePath])

    if (storageError) {
      throw new Error(`Storage deletion error: ${storageError.message}`)
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId)

    if (dbError) {
      throw new Error(`Database deletion error: ${dbError.message}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[File Deletion Error]:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Deletion failed' },
      { status: 500 }
    )
  }
}