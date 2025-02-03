import { useState } from 'react';
import { createClient } from "@/utils/supabase/client";

export interface FileData {
  id: string;
  file_path: string;
  file_type: string;
  original_name: string;
  created_at: string;
}

export function useFileManager() {
  const [loading, setLoading] = useState<string | null>(null);
  const supabase = createClient();

  const handleDownload = async (file: FileData) => {
    try {
      setLoading(file.id);
      const { data, error } = await supabase.storage
        .from('files')
        .download(file.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.original_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    } finally {
      setLoading(null);
    }
  };

  const convertPdfToText = async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/convert-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to convert PDF');
      }

      const { text } = await response.json();
      return text;
    } catch (error) {
      console.error('PDF conversion error:', error);
      throw new Error('Failed to convert PDF to text');
    }
  };

  return {
    loading,
    handleDownload,
    convertPdfToText
  };
}