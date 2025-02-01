import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const PDFCROWD_USERNAME = process.env.PDFCROWD_USERNAME
const PDFCROWD_API_KEY = process.env.PDFCROWD_API_KEY
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
   
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!PDFCROWD_USERNAME || !PDFCROWD_API_KEY) {
      throw new Error('PDFcrowd credentials not configured')
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
   
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB' },
        { status: 400 }
      )
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF files are allowed' },
        { status: 400 }
      )
    }

    const pdfcrowdForm = new FormData()
    pdfcrowdForm.append('input_format', 'pdf')
    pdfcrowdForm.append('output_format', 'txt')
    pdfcrowdForm.append('file', file)
   
    const auth = Buffer.from(`${PDFCROWD_USERNAME}:${PDFCROWD_API_KEY}`).toString('base64')
   
    console.log('Making PDFcrowd request...')
    const response = await fetch('https://api.pdfcrowd.com/convert/24.04/', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`
      },
      body: pdfcrowdForm
    })

    // Log response details for debugging
    console.log('PDFcrowd response:', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length')
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('PDFcrowd error response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      throw new Error(`PDFcrowd API error: ${errorText}`)
    }

    // Check content type
    const contentType = response.headers.get('content-type')
    if (!contentType?.includes('text/plain')) {
      console.warn('Unexpected content type:', contentType)
    }

    const textContent = await response.text()
    
    // Log content length for debugging
    console.log('Converted text length:', textContent.length)
    
    if (!textContent || textContent.length === 0) {
      throw new Error('Empty conversion result')
    }

    // Log first few characters of content for debugging
    console.log('First 100 chars of converted text:', textContent.substring(0, 100))

    return NextResponse.json({ text: textContent })
  } catch (error) {
    console.error('[PDF Conversion Error]:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Conversion failed: ${error.message}` },
        { status: 500 }
      )
    }
   
    return NextResponse.json(
      { error: 'Conversion failed. Please try again.' },
      { status: 500 }
    )
  }
}