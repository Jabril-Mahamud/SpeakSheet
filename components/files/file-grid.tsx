"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFileManager, type FileData } from "@/hooks/useFileManager";
import { formatDate } from "@/utils/dateFormat";
import { toast } from "@/hooks/use-toast";
import { getFileIcon } from "../common/FileIcon";
import DeleteButton from "../upload/delete-button";
import { ConvertButton } from "../upload/convert-button";
import { FileDialog } from "./FileDialog";
import { useRealTimeFiles } from "@/hooks/useRealTimeFiles";
import { FilterButton } from "../common/FilterButton";

type FilterType = "all" | "txt" | "audio" | "chat_message";

export function FileGrid({ files: initialFiles }: { files: FileData[] }) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const { loading, handleDownload } = useFileManager();
  
  const { 
    files, 
    fileContents, 
    loadingContents, 
    fetchFileContent,
    removeFile 
  } = useRealTimeFiles(initialFiles);

  const handleView = async (file: FileData) => {
    await fetchFileContent(file);
    setSelectedFile(file);
  };

  const handleDeleteComplete = (fileId: string) => {
    if (selectedFile?.id === fileId) {
      setSelectedFile(null);
    }
  };

  const filteredFiles = files.filter((file) => {
    // Handle chat_message files separately
    const isChatMessage = file.original_name.startsWith("chat_message");
    
    // If we're specifically viewing chat messages, only show those
    if (filter === "chat_message") return isChatMessage;
    
    // For all other filter types, exclude chat messages
    if (isChatMessage) return false;
    
    // Then apply the regular type filters
    if (filter === "all") return true;
    if (filter === "txt") return file.file_type === "text/plain";
    if (filter === "audio") return file.file_type.includes("audio");
    return true;
  });

  return (
    <>
      <div className="space-y-6">
        <div className="flex gap-2 flex-wrap">
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
            Text Files
          </FilterButton>
          <FilterButton
            active={filter === "audio"}
            onClick={() => setFilter("audio")}
          >
            Audio Files
          </FilterButton>
          <FilterButton
            active={filter === "chat_message"}
            onClick={() => setFilter("chat_message")}
          >
            Chat Messages
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
                    <p className="font-medium truncate">
                      {file.original_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(file.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                  <Button
                    onClick={() => handleDownload(file)}
                    disabled={loading === file.id}
                    variant="ghost"
                    size="icon"
                    title="Download"
                  >
                    {loading === file.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                  {file.file_type === "text/plain" && (
                    <ConvertButton
                      text={fileContents[file.id] || ''}
                      fileName={file.original_name}
                      onProgress={() => {}}
                      onComplete={() => {
                        toast({
                          title: "Success",
                          description: "Text converted to audio successfully",
                        });
                      }}
                      onError={(error) => {
                        toast({
                          title: "Error",
                          description: error,
                          variant: "destructive",
                        });
                      }}
                      disabled={loading === file.id || loadingContents[file.id]}
                      iconOnly={true}
                    />
                  )}
                  <DeleteButton
                    filePath={file.file_path}
                    fileId={file.id}
                    onComplete={() => handleDeleteComplete(file.id)}
                    onError={(error) => {
                      toast({
                        title: "Error",
                        description: error,
                        variant: "destructive",
                      });
                    }}
                    onOptimisticDelete={removeFile}
                    disabled={loading === file.id}
                    iconOnly={true}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedFile && (
        <FileDialog
          mode="view"
          file={selectedFile}
          content={fileContents[selectedFile.id] || ''}
          open={!!selectedFile}
          onOpenChange={(open) => !open && setSelectedFile(null)}
        />
      )}
    </>
  );
}