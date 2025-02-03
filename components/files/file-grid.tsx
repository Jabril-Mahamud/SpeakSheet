"use client";

import { useState } from "react";
import { File, Download, FileAudio, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useFileManager, type FileData } from "@/hooks/useFileManager";
import { formatDate } from "@/utils/dateFormat";
import { createClient } from "@/utils/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getFileIcon } from "../common/FileIcon";
import { useRouter } from "next/navigation";
import DeleteButton from "../upload/delete-button";
import { ConvertButton } from "../upload/convert-button";
import { FileDialog } from "./FileDialog";

export function FileGrid({ files }: { files: FileData[] }) {
  const [filter, setFilter] = useState<"all" | "txt" | "audio">("all");
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [isConverting, setIsConverting] = useState(false);

  const { loading, handleDownload } = useFileManager();
  const supabase = createClient();
  const router = useRouter();

  const filteredFiles = files.filter((file) => {
    if (filter === "all") return true;
    if (filter === "txt") return file.file_type === "text/plain";
    if (filter === "audio") return file.file_type.includes("audio");
    return true;
  });

  const handleView = async (file: FileData) => {
    try {
      if (file.file_type === "text/plain") {
        const { data, error } = await supabase.storage
          .from("files")
          .download(file.file_path);

        if (error) throw error;

        const text = await data.text();
        setFileContent(text);
      }

      setSelectedFile(file);
    } catch (error) {
      console.error("Error loading file:", error);
      toast({
        title: "Error",
        description: "Failed to load file content. Please try again.",
        variant: "destructive",
      });
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
            Text Files
          </FilterButton>
          <FilterButton
            active={filter === "audio"}
            onClick={() => setFilter("audio")}
          >
            Audio Files
          </FilterButton>
        </div>

        {filteredFiles.length === 0 ? (
          <div className="text-center p-12 bg-accent/50 rounded-lg">
            <p className="text-muted-foreground">No files found</p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filteredFiles.map((currentFile) => (
              <div
                key={currentFile.id}
                className="p-4 bg-accent/50 rounded-lg flex items-center justify-between gap-4 hover:bg-accent/75 transition-colors cursor-pointer"
                onClick={() => handleView(currentFile)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {getFileIcon(currentFile.file_type)}
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {currentFile.original_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(currentFile.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(currentFile);
                    }}
                    disabled={loading === currentFile.id}
                    variant="ghost"
                    size="icon"
                    title="Download"
                  >
                    {loading === currentFile.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                  {currentFile.file_type === "text/plain" && (
                    <ConvertButton
                      text={fileContent}
                      fileName={currentFile.original_name}
                      onProgress={(progress) => {
                        // Handle progress if needed
                      }}
                      onComplete={() => {
                        router.refresh();
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
                      disabled={loading === currentFile.id}
                      iconOnly={true}
                    />
                  )}
                  <DeleteButton
                    filePath={currentFile.file_path}
                    fileId={currentFile.id}
                    onComplete={() => {
                      router.refresh();
                      if (selectedFile?.id === currentFile.id) {
                        setSelectedFile(null);
                      }
                    }}
                    onError={(error) => {
                      toast({
                        title: "Error",
                        description: error,
                        variant: "destructive",
                      });
                    }}
                    disabled={loading === currentFile.id}
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
          content={fileContent}
          open={!!selectedFile}
          onOpenChange={(open:any) => !open && setSelectedFile(null)}
        />
      )}
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
    <Button
      onClick={onClick}
      variant={active ? "default" : "secondary"}
      size="sm"
    >
      {children}
    </Button>
  );
}
