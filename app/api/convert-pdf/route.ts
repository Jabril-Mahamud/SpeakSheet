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

    // Get original filename without extension
    const originalName = file.name.replace(/\.pdf$/i, '')

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

    if (!response.ok) {
      const errorText = await response.text()
      console.error('PDFcrowd error response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      throw new Error(`PDFcrowd API error: ${errorText}`)
    }

    const textContent = await response.text()
    
    if (!textContent || textContent.length === 0) {
      throw new Error('Empty conversion result')
    }

    return NextResponse.json({ 
      text: textContent,
      originalName: `${originalName}.txt` // Send back the original name with .txt extension
    })
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