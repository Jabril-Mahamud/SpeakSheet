import { useState } from 'react';
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { FileData } from './useFileManager';

export function useFileHandling() {
  const [loading, setLoading] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

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
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (file: FileData, onSuccess?: () => void) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      setLoading(file.id);

      const { error: storageError } = await supabase.storage
        .from('files')
        .remove([file.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      onSuccess?.();
      router.refresh();
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setLoading(null);
    }
  };

  return {
    loading,
    handleDownload,
    handleDelete
  };
}