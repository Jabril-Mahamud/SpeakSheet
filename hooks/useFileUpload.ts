import { useState } from 'react';
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { convertPdfToText } from '@/utils/fileUtils';

export const useFileUpload = () => {
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileType = file.type;
      if (!fileType.includes('pdf') && !fileType.includes('audio')) {
        setError('Only PDF and audio files are allowed');
        return;
      }
    }

    setFiles(selectedFiles);
    setError(null);
  };

  const uploadFile = async (file: File, user: any) => {
    if (file.type.includes('pdf')) {
      const textContent = await convertPdfToText(file);
      const textBlob = new Blob([textContent], { type: 'text/plain' });
      const textFileName = file.name.replace('.pdf', '.txt');
      const textFile = new File([textBlob], textFileName, { type: 'text/plain' });

      const fileName = `${Math.random()}.txt`;
      const filePath = `${user.id}/text/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, textFile);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('files')
        .insert({
          id: crypto.randomUUID(),
          user_id: user.id,
          file_path: filePath,
          file_type: 'text/plain',
          original_name: textFileName,
        });

      if (dbError) throw dbError;
    } else {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/audio/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('files')
        .insert({
          id: crypto.randomUUID(),
          user_id: user.id,
          file_path: filePath,
          file_type: file.type,
          original_name: file.name,
        });

      if (dbError) throw dbError;
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files || files.length === 0) {
      setError('Please select files to upload');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const uploadPromises = Array.from(files).map(file => uploadFile(file, user));
      await Promise.all(uploadPromises);
      
      router.refresh();
      setFiles(null);
      return true;
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload files');
      return false;
    } finally {
      setUploading(false);
    }
  };

  return {
    files,
    uploading,
    error,
    handleFileChange,
    handleUpload
  };
};
