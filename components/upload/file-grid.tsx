"use client";
import { useState } from "react";
import { File, Download, FileAudio, X, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { getFileIcon } from "../common/FileIcon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDate } from "@/utils/dateFormat";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import DeleteButton from "./delete-button";

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
  const [isConverting, setIsConverting] = useState(false);
  const supabase = createClient();
  const router = useRouter();

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
      toast({
        title: "Error",
        description: "Failed to load file content. Please try again.",
        variant: "destructive",
      });
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

      toast({
        title: "Success",
        description: "File downloaded successfully",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Error",
        description: "Failed to download file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleConvertToAudio = async () => {
    if (!selectedFile || !fileContent) return;

    try {
      setIsConverting(true);
      const response = await fetch("/api/convert-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: fileContent,
          voiceId: "Matthew",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to convert to audio");
      }

      toast({
        title: "Success",
        description: "Text converted to audio successfully",
      });
      router.refresh();
    } catch (error) {
      console.error("Conversion error:", error);
      toast({
        title: "Error",
        description: "Failed to convert text to audio. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
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
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(file);
                    }}
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={!!selectedFile}
        onOpenChange={(open) => !open && setSelectedFile(null)}
      >
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <DialogTitle>{selectedFile?.original_name}</DialogTitle>
            {selectedFile && selectedFile.file_type === "text/plain" && (
              <div className="flex gap-2 pr-8">
                <Button
                  onClick={async () => {
                    if (!selectedFile || !fileContent) return;

                    try {
                      const response = await fetch("/api/convert-audio", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          text: fileContent,
                          voiceId: "Matthew",
                        }),
                      });

                      if (!response.ok) {
                        throw new Error("Failed to convert to audio");
                      }

                      router.refresh();
                    } catch (error) {
                      console.error("Conversion error:", error);
                    }
                  }}
                  size="sm"
                  variant="secondary"
                >
                  <FileAudio className="h-4 w-4 mr-2" />
                  Convert to Audio
                </Button>
                <DeleteButton
                  filePath={selectedFile.file_path}
                  fileId={selectedFile.id}
                  onComplete={() => {
                    setSelectedFile(null);
                    router.refresh();
                  }}
                  onError={(error) => {
                    console.error("Delete error:", error);
                  }}
                />
              </div>
            )}
          </DialogHeader>

          <ScrollArea className="flex-1 w-full">
            {viewLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
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
    <Button
      onClick={onClick}
      variant={active ? "default" : "secondary"}
      size="sm"
    >
      {children}
    </Button>
  );
}
