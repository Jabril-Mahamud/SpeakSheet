// hooks/useFileUpload.ts
import { useState } from 'react';
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useFileManager } from './useFileManager';

export function useFileUpload() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const { convertPdfToText } = useFileManager();
  const supabase = createClient();
  const router = useRouter();

  const validateFiles = (files: FileList): string | null => {
    for (const file of Array.from(files)) {
      if (!file.type.includes('pdf') && !file.type.includes('audio')) {
        return 'Only PDF and audio files are allowed';
      }
      
      // Optional: Add size validation
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        return `File ${file.name} is too large. Maximum size is 50MB.`;
      }
    }
    return null;
  };

  const handleUpload = async () => {
    if (!files?.length) return 'Please select files to upload';

    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      await Promise.all(Array.from(files).map(async (file) => {
        if (file.type.includes('pdf')) {
          const textContent = await convertPdfToText(file);
          const textBlob = new Blob([textContent], { type: 'text/plain' });
          const textFileName = file.name.replace('.pdf', '.txt');
          const textFile = new File([textBlob], textFileName, { type: 'text/plain' });
          
          await uploadFile(textFile, user.id, 'text');
        } else {
          await uploadFile(file, user.id, 'audio');
        }
      }));

      router.refresh();
      return null;
    } catch (error) {
      console.error('Upload error:', error);
      return 'Failed to upload files';
    } finally {
      setUploading(false);
    }
  };

  const uploadFile = async (file: File, userId: string, type: 'text' | 'audio') => {
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/${type}/${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('files')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { error: dbError } = await supabase
      .from('files')
      .insert({
        id: crypto.randomUUID(),
        user_id: userId,
        file_path: filePath,
        file_type: file.type,
        original_name: file.name,
        created_at: new Date().toISOString(),
      });

    if (dbError) throw dbError;
  };

  return {
    files,
    setFiles,
    uploading,
    validateFiles, 
    handleUpload
  };
}