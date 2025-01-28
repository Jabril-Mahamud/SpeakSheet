'use client'

import { useState } from 'react';
import { File, FileAudio, Download, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

interface FileData {
  id: string;
  file_path: string;
  file_type: string;
  original_name: string;
  created_at: string;
}

export default function FileList({ initialFiles }: { initialFiles: FileData[] }) {
  const [files, setFiles] = useState(initialFiles);
  const [loading, setLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pdf' | 'audio'>('all');
  const supabase = createClient();
  const router = useRouter();

  const filteredFiles = files.filter(file => {
    if (filter === 'all') return true;
    if (filter === 'pdf') return file.file_type.includes('pdf');
    if (filter === 'audio') return file.file_type.includes('audio');
    return true;
  });

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

  const handleDelete = async (file: FileData) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      setLoading(file.id);

      const { error: storageError } = await supabase.storage
        .from('files')
        .remove([file.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('user_files')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      setFiles(files.filter(f => f.id !== file.id));
      router.refresh();
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <FilterButton
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          >
            All Files
          </FilterButton>
          <FilterButton
            active={filter === 'pdf'}
            onClick={() => setFilter('pdf')}
          >
            PDFs
          </FilterButton>
        </div>
        
        <p className="text-sm text-muted-foreground">
          {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''}
        </p>
      </div>

      {filteredFiles.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed border-accent rounded-lg">
          <p className="text-muted-foreground">No files found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className="p-4 bg-accent/50 rounded-lg flex items-center justify-between gap-4 hover:bg-accent/75 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                {file.file_type.includes('pdf') ? (
                  <File size={24} className="text-foreground/80 shrink-0" />
                ) : (
                  <FileAudio size={24} className="text-foreground/80 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="font-medium truncate">{file.original_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(file.created_at)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDownload(file)}
                  disabled={loading === file.id}
                  className="p-2 hover:bg-background/50 rounded-md"
                  title="Download"
                >
                  <Download size={18} />
                </button>
                <button
                  onClick={() => handleDelete(file)}
                  disabled={loading === file.id}
                  className="p-2 hover:bg-background/50 rounded-md text-destructive"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterButton({ 
  children, 
  active, 
  onClick 
}: { 
  children: React.ReactNode; 
  active: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-md text-sm transition-colors ${
        active 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-accent/50 hover:bg-accent text-foreground'
      }`}
    >
      {children}
    </button>
  );
}