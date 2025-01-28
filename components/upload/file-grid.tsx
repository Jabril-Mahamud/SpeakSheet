'use client'

import { useState } from 'react';
import { File, FileAudio, Download, ExternalLink } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface FileData {
  id: string;
  file_path: string;
  file_type: string;
  original_name: string;
  created_at: string;
}

export default function FileGrid({ files }: { files: FileData[] }) {
  const [filter, setFilter] = useState<'all' | 'pdf' | 'audio'>('all');
  const [loading, setLoading] = useState<string | null>(null);
  const supabase = createClient();

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
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
        <FilterButton
          active={filter === 'audio'}
          onClick={() => setFilter('audio')}
        >
          Audio
        </FilterButton>
      </div>

      {filteredFiles.length === 0 ? (
        <div className="text-center p-12 bg-accent/50 rounded-lg">
          <p className="text-muted-foreground">No files found</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className="p-4 bg-accent/50 rounded-lg flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                {file.file_type.includes('pdf') ? (
                  <File size={24} className="text-foreground/80" />
                ) : (
                  <FileAudio size={24} className="text-foreground/80" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{file.original_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(file.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-auto pt-2 border-t border-accent">
                <button
                  onClick={() => handleDownload(file)}
                  disabled={loading === file.id}
                  className="flex-1 flex items-center justify-center gap-2 p-2 hover:bg-accent rounded-md text-sm"
                >
                  <Download size={16} />
                  Download
                </button>
                {file.file_type.includes('pdf') && (
                  <button
                    onClick={() => {/* Link to conversion page */}}
                    className="flex-1 flex items-center justify-center gap-2 p-2 hover:bg-accent rounded-md text-sm"
                  >
                    <ExternalLink size={16} />
                    Convert
                  </button>
                )}
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
      className={`px-4 py-2 rounded-md text-sm ${
        active 
          ? 'bg-foreground text-background' 
          : 'bg-accent/50 hover:bg-accent'
      }`}
    >
      {children}
    </button>
  );
}