"use client";

import { useState } from "react";
import { File, FileAudio, Download, ExternalLink, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { getFileIcon } from "../common/FileIcon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDate } from "@/utils/dateFormat";

interface FileData {
  id: string;
  file_path: string;
  file_type: string;
  original_name: string;
  created_at: string;
}

export default function FileGrid({ files }: { files: FileData[] }) {
  const [filter, setFilter] = useState<"all" | "txt" | "audio">("all");
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [viewLoading, setViewLoading] = useState(false);
  const supabase = createClient();
  const [audioLoading, setAudioLoading] = useState<string | null>(null);

  const filteredFiles = files.filter((file) => {
    if (filter === "all") return true;
    if (filter === "txt")
      return file.file_type === "text/plain" || file.file_type.includes("pdf");
    if (filter === "audio") return file.file_type.includes("audio");
    return true;
  });

  const handleView = async (file: FileData) => {
    try {
      setViewLoading(true);
      setSelectedFile(file);

      if (file.file_type === "text/plain") {
        const { data, error } = await supabase.storage
          .from("files")
          .download(file.file_path);

        if (error) throw error;

        const text = await data.text();
        setFileContent(text);
      }
    } catch (error) {
      console.error("Error loading file:", error);
      setFileContent("Error loading file content");
    } finally {
      setViewLoading(false);
    }
  };

  const handleDownload = async (file: FileData) => {
    try {
      setLoading(file.id);
      const { data, error } = await supabase.storage
        .from("files")
        .download(file.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.original_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
    } finally {
      setLoading(null);
    }
  };

  const handleAudioConvert = async (file: FileData) => {
    try {
      setAudioLoading(file.id);
      
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('files')
        .download(file.file_path);
  
      if (downloadError) throw downloadError;
      const text = await fileData.text();
      
      const response = await fetch('/api/convert-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceId: 'Xb7hH8MSUJpSbSDYk0k2'
        })
      });
  
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      window.open(result.audioUrl, '_blank');
    } catch (error) {
      console.error('Audio conversion error:', error);
    } finally {
      setAudioLoading(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex gap-2">
          <FilterButton
            active={filter === "all"}
            onClick={() => setFilter("all")}
          >
            All Files
          </FilterButton>
          <FilterButton
            active={filter === "txt"}
            onClick={() => setFilter("txt")}
          >
            txts
          </FilterButton>
          <FilterButton
            active={filter === "audio"}
            onClick={() => setFilter("audio")}
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
                className="p-4 bg-accent/50 rounded-lg flex items-center justify-between gap-4 hover:bg-accent/75 transition-colors cursor-pointer"
                onClick={() => handleView(file)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {getFileIcon(file.file_type)}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{file.original_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(file.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(file);
                    }}
                    disabled={loading === file.id}
                    className="p-2 hover:bg-background/50 rounded-md"
                    title="Download"
                  >
                    <Download size={18} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAudioConvert(file);
                    }}
                    disabled={
                      audioLoading === file.id ||
                      file.file_type !== "text/plain"
                    }
                    className="p-2 hover:bg-background/50 rounded-md disabled:opacity-50"
                    title="Convert to Audio"
                  >
                    {audioLoading === file.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-foreground" />
                    ) : (
                      <FileAudio size={18} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedFile?.original_name}</DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 w-full">
            {viewLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : selectedFile?.file_type === "text/plain" ? (
              <div className="p-4 whitespace-pre-wrap font-mono text-sm">
                {fileContent}
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                This file type cannot be previewed
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FilterButton({
  children,
  active,
  onClick,
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
          ? "bg-foreground text-background"
          : "bg-accent/50 hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}
