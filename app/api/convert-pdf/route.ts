import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const PDFCROWD_USERNAME = process.env.PDFCROWD_USERNAME
const PDFCROWD_API_KEY = process.env.PDFCROWD_API_KEY
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate environment variables
    if (!PDFCROWD_USERNAME || !PDFCROWD_API_KEY) {
      return NextResponse.json(
        { error: 'Service configuration error' }, 
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
   
    // Validate file presence
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' }, 
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB' }, 
        { status: 400 }
      )
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF files are allowed' }, 
        { status: 400 }
      )
    }

    // Setup conversion request
    const pdfcrowdForm = new FormData()
    pdfcrowdForm.append('input_format', 'pdf')
    pdfcrowdForm.append('output_format', 'txt')
    pdfcrowdForm.append('file', file)
    
    const auth = Buffer.from(`${PDFCROWD_USERNAME}:${PDFCROWD_API_KEY}`).toString('base64')
   
    // Make conversion request
    const response = await fetch('https://api.pdfcrowd.com/convert/24.04/', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`
      },
      body: pdfcrowdForm
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error('Conversion failed')
    }

    const textContent = await response.text()

    // Validate response content
    if (!textContent || textContent.length === 0) {
      throw new Error('Empty conversion result')
    }

    return NextResponse.json({ text: textContent })
  } catch (error) {
    // Log error for monitoring but don't expose details to client
    console.error('[PDF Conversion Error]:', error)
    
    return NextResponse.json(
      { error: 'Conversion failed. Please try again.' },
      { status: 500 }
    )
  }
}