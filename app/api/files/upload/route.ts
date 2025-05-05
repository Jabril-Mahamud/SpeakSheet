// app/api/files/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // ─── Auth ─────────────────────────────────────────────────────────────────
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (!user || authError) {
    console.error('Auth error:', authError);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ─── OCR.space Key ─────────────────────────────────────────────────────────
  const OCR_SPACE_API_KEY = process.env.OCR_SPACE_API_KEY;
  if (!OCR_SPACE_API_KEY) {
    console.error('Missing OCR_SPACE_API_KEY');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    if (!files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const fileIds: string[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const fileId = uuidv4();
      const originalName = file.name;
      const ext = originalName.split('.').pop()?.toLowerCase() || '';
      if (ext !== 'pdf' && ext !== 'txt') {
        errors.push(`Unsupported file type: ${ext}`);
        continue;
      }

      let textContent = '';
      let characterCount = 0;

      try {
        const arrayBuffer = await file.arrayBuffer();

        if (ext === 'pdf') {
          // ── Call OCR.space API ────────────────────────────────────────────────
          const apiForm = new FormData();
          apiForm.append('apikey', OCR_SPACE_API_KEY);
          apiForm.append('language', 'eng');                // adjust as needed
          apiForm.append('isOverlayRequired', 'false');
          apiForm.append(
            'file',
            new Blob([arrayBuffer], { type: 'application/pdf' }),
            originalName
          );

          const apiRes = await fetch('https://api.ocr.space/parse/image', {
            method: 'POST',
            body: apiForm,
          });

          if (!apiRes.ok) {
            const errBody = await apiRes.text();
            throw new Error(`OCR.space ${apiRes.status}: ${errBody}`);
          }

          const json = await apiRes.json() as any;
          if (
            !json.ParsedResults ||
            !json.ParsedResults.length ||
            !json.ParsedResults[0].ParsedText
          ) {
            throw new Error('No text returned from OCR.space');
          }

          textContent = json.ParsedResults[0].ParsedText as string;
          characterCount = textContent.length;
        } else {
          // ── TXT file branch ──────────────────────────────────────────────────
          const decoder = new TextDecoder();
          textContent = decoder.decode(arrayBuffer);
          characterCount = textContent.length;
        }

        if (!textContent.trim()) {
          throw new Error('Empty text after conversion');
        }
      } catch (e) {
        console.error('Conversion error:', e);
        errors.push(
          `Failed to convert ${originalName}: ${e instanceof Error ? e.message : e}`
        );
        continue;
      }

      // ─── Upload text to Supabase Storage ───────────────────────────────────
      const baseName = originalName.replace(/\.[^/.]+$/, '');
      const displayName = baseName || 'unnamed';
      const textFilePath = `${user.id}/${displayName}-${fileId}.txt`;

      const uploadBlob = new Blob([textContent], { type: 'text/plain' });
      const { error: uploadErr } = await supabase.storage
        .from('files')
        .upload(textFilePath, uploadBlob);

      if (uploadErr) {
        console.error('Storage upload error:', uploadErr);
        errors.push(`Save error for ${originalName}: ${uploadErr.message}`);
        continue;
      }

      // ─── Insert metadata into Postgres ────────────────────────────────────
      const { error: dbErr } = await supabase.from('files').insert({
        id: fileId,
        user_id: user.id,
        file_path: textFilePath,
        file_type: 'text/plain',
        original_name: originalName,
        character_count: characterCount,
        conversion_status: 'completed',
      });

      if (dbErr) {
        console.error('DB insert error:', dbErr);
        errors.push(`Metadata save failed for ${originalName}: ${dbErr.message}`);
        continue;
      }

      fileIds.push(fileId);
    }

    // ─── Response ────────────────────────────────────────────────────────────
    if (fileIds.length) {
      return NextResponse.json({
        message: `${fileIds.length} file(s) processed successfully`,
        fileIds,
        errors: errors.length ? errors : undefined,
      });
    } else {
      return NextResponse.json({ error: 'All conversions failed', errors }, { status: 500 });
    }
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      {
        error: 'Server error during upload',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
