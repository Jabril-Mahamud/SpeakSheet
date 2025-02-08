import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { captureServerEvent } from '@/utils/posthog-server'

const PDFCROWD_USERNAME = process.env.PDFCROWD_USERNAME
const PDFCROWD_API_KEY = process.env.PDFCROWD_API_KEY
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  try {
    if (!user) {
      await captureServerEvent('pdf_conversion_unauthorized', user, {
        error: 'User not authenticated'
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!PDFCROWD_USERNAME || !PDFCROWD_API_KEY) {
      await captureServerEvent('pdf_conversion_error', user, {
        error: 'PDFcrowd credentials not configured',
        stage: 'configuration'
      });
      throw new Error('PDFcrowd credentials not configured')
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
   
    if (!file) {
      await captureServerEvent('pdf_conversion_error', user, {
        error: 'No file provided',
        stage: 'validation'
      });
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      await captureServerEvent('pdf_conversion_error', user, {
        error: 'File too large',
        stage: 'validation',
        fileSize: file.size,
        maxSize: MAX_FILE_SIZE
      });
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB' },
        { status: 400 }
      )
    }

    if (file.type !== 'application/pdf') {
      await captureServerEvent('pdf_conversion_error', user, {
        error: 'Invalid file type',
        stage: 'validation',
        fileType: file.type
      });
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF files are allowed' },
        { status: 400 }
      )
    }

    // Get original filename without extension
    const originalName = file.name.replace(/\.pdf$/i, '')

    await captureServerEvent('pdf_conversion_started', user, {
      fileName: file.name,
      fileSize: file.size
    });

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
      
      await captureServerEvent('pdf_conversion_error', user, {
        error: errorText,
        stage: 'pdfcrowd',
        status: response.status
      });
      
      throw new Error(`PDFcrowd API error: ${errorText}`)
    }

    const textContent = await response.text()
    
    if (!textContent || textContent.length === 0) {
      await captureServerEvent('pdf_conversion_error', user, {
        error: 'Empty conversion result',
        stage: 'content_validation'
      });
      throw new Error('Empty conversion result')
    }

    await captureServerEvent('pdf_conversion_completed', user, {
      fileName: file.name,
      fileSize: file.size,
      resultLength: textContent.length
    });

    return NextResponse.json({ 
      text: textContent,
      originalName: `${originalName}.txt`
    })
  } catch (error) {
    console.error('[PDF Conversion Error]:', error)
    
    const errorMessage = error instanceof Error ? 
      `Conversion failed: ${error.message}` : 
      'Conversion failed. Please try again.';

    await captureServerEvent('pdf_conversion_error', user, {
      error: errorMessage,
      stage: 'unknown'
    });
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}