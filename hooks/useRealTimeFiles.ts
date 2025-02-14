// hooks/useRealTimeFiles.ts
import { useState, useEffect, useCallback } from 'react';
import { createClient } from "@/utils/supabase/client";
import { toast } from './use-toast';
import { FileData } from '@/utils/types';

export function useRealTimeFiles(initialFiles: FileData[]) {
  const [files, setFiles] = useState<FileData[]>(initialFiles);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [loadingContents, setLoadingContents] = useState<Record<string, boolean>>({});
  const supabase = createClient();

  // Optimistic update functions
  const addFile = useCallback((file: FileData) => {
    setFiles(prev => [file, ...prev]);
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    setFileContents(prev => {
      const updated = { ...prev };
      delete updated[fileId];
      return updated;
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    // Initialize real-time subscription
    const channel = supabase
      .channel('public:files')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'files'
        },
        (payload) => {
          if (!mounted) return;

          if (payload.eventType === 'INSERT') {
            // Check if we already have this file (from optimistic update)
            setFiles(prev => {
              const exists = prev.some(f => f.id === payload.new.id);
              if (exists) return prev;
              return [payload.new as FileData, ...prev];
            });
          } 
          else if (payload.eventType === 'DELETE') {
            setFiles(prev => prev.filter(f => f.id !== payload.old.id));
            setFileContents(prev => {
              const updated = { ...prev };
              delete updated[payload.old.id];
              return updated;
            });
          }
          else if (payload.eventType === 'UPDATE') {
            setFiles(prev => 
              prev.map(file => 
                file.id === payload.new.id ? { ...file, ...payload.new } : file
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const fetchFileContent = async (file: FileData) => {
    if (fileContents[file.id] || file.file_type !== "text/plain") {
      return fileContents[file.id];
    }

    setLoadingContents(prev => ({ ...prev, [file.id]: true }));

    try {
      const { data, error } = await supabase.storage
        .from("files")
        .download(file.file_path);

      if (error) throw error;

      const text = await data.text();
      
      if (text) {
        setFileContents(prev => ({
          ...prev,
          [file.id]: text
        }));
      }
      
      return text;
    } catch (error) {
      console.error("Error loading file:", error);
      toast({
        title: "Error",
        description: "Failed to load file content",
        variant: "destructive",
      });
      return '';
    } finally {
      setLoadingContents(prev => ({ ...prev, [file.id]: false }));
    }
  };

  return {
    files,
    fileContents,
    loadingContents,
    fetchFileContent,
    addFile,
    removeFile
  };
}