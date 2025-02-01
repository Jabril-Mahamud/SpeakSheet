"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { InfoIcon, Upload, Loader2, Headphones, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface FileRecord {
  id: string;
  file_path: string;
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: "uploading" | "converting" | "processing" | "complete" | "error";
  fileRecord?: FileRecord;
}

// Convert to Audio Button Component
function ConvertButton({
  text,
  fileName,
  onProgress,
  onComplete,
  onError,
  disabled,
}: {
  text: string;
  fileName: string;
  onProgress: (progress: number) => void;
  onComplete: () => void;
  onError: (error: string) => void;
  disabled?: boolean;
}) {
  const [converting, setConverting] = useState(false);

  const handleConvert = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      setConverting(true);
      onProgress(33);

      const response = await fetch("/api/convert-audio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          voiceId: "Matthew",
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      onProgress(66);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      onProgress(100);
      onComplete();
    } catch (error) {
      console.error("Conversion error:", error);
      onError(
        error instanceof Error ? error.message : "Failed to convert to audio"
      );
    } finally {
      setConverting(false);
    }
  };

  return (
    <Button
      onClick={handleConvert}
      disabled={disabled || converting}
      variant="secondary"
      size="sm"
      className="ml-2"
      type="button"
    >
      {converting ? (
        <Loader2 size={16} className="animate-spin mr-2" />
      ) : (
        <Headphones size={16} className="mr-2" />
      )}
      {converting ? "Converting..." : "Convert to Audio"}
    </Button>
  );
}

export default function UploadModal({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});
  const [convertedFiles, setConvertedFiles] = useState<Record<string, string>>({});
  const supabase = createClient();
  const router = useRouter();

  const resetModal = () => {
    setFiles(null);
    setUploadProgress({});
    setConvertedFiles({});
    setError(null);
  };

  const checkAllFilesComplete = () => {
    if (!files) return false;
    return Array.from(files).every(
      file => uploadProgress[file.name]?.status === 'complete'
    );
  };

  const handleCloseModal = () => {
    setOpen(false);
    // Reset the modal state after it's closed
    setTimeout(resetModal, 300); // Wait for dialog close animation
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    // Validate file types
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileType = file.type;
      if (!fileType.includes("pdf") && !fileType.includes("audio")) {
        setError("Only PDF and audio files are allowed");
        return;
      }
    }

    setFiles(selectedFiles);
    setError(null);
    setUploadProgress({});
    setConvertedFiles({});
  };

  const updateFileProgress = (
    fileName: string,
    updates: Partial<UploadProgress>
  ) => {
    setUploadProgress((prev) => ({
      ...prev,
      [fileName]: {
        ...prev[fileName],
        ...updates,
      },
    }));
  };

  const convertPdfToText = async (file: File): Promise<string> => {
    try {
      updateFileProgress(file.name, { status: "converting", progress: 33 });

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/convert-pdf", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Conversion failed");
      }

      const { text } = await response.json();
      updateFileProgress(file.name, { progress: 66, status: "processing" });
      return text;
    } catch (error) {
      console.error("PDF conversion error:", error);
      updateFileProgress(file.name, { status: "error" });
      throw new Error("Failed to convert PDF to text");
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files || files.length === 0) {
      setError("Please select files to upload");
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const initialProgress: Record<string, UploadProgress> = {};
      Array.from(files).forEach((file) => {
        initialProgress[file.name] = {
          fileName: file.name,
          progress: 0,
          status: "uploading",
        };
      });
      setUploadProgress(initialProgress);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      await Promise.all(
        Array.from(files).map(async (file) => {
          try {
            if (file.type.includes("pdf")) {
              const textContent = await convertPdfToText(file);
              const textBlob = new Blob([textContent], { type: "text/plain" });
              const textFileName = file.name.replace(".pdf", ".txt");
              const textFile = new File([textBlob], textFileName, {
                type: "text/plain",
              });

              const fileName = `${user.id}/text/${Math.random()}.txt`;

              const { error: uploadError } = await supabase.storage
                .from("files")
                .upload(fileName, textFile);

              if (uploadError) throw uploadError;

              const { data: fileRecord, error: dbError } = await supabase
                .from("files")
                .insert({
                  id: crypto.randomUUID(),
                  user_id: user.id,
                  file_path: fileName,
                  file_type: "text/plain",
                  original_name: textFileName,
                  created_at: new Date().toISOString(),
                })
                .select()
                .single();

              if (dbError) throw dbError;

              setConvertedFiles((prev) => ({
                ...prev,
                [file.name]: textContent,
              }));

              updateFileProgress(file.name, {
                progress: 100,
                status: "complete",
                fileRecord: {
                  id: fileRecord.id,
                  file_path: fileName,
                },
              });
            } else {
              updateFileProgress(file.name, { status: "uploading" });
              const fileExt = file.name.split(".").pop();
              const fileName = `${user.id}/audio/${Math.random()}.${fileExt}`;

              const { error: uploadError } = await supabase.storage
                .from("files")
                .upload(fileName, file);

              if (uploadError) throw uploadError;

              const { data: fileRecord, error: dbError } = await supabase
                .from("files")
                .insert({
                  id: crypto.randomUUID(),
                  user_id: user.id,
                  file_path: fileName,
                  file_type: file.type,
                  original_name: file.name,
                  created_at: new Date().toISOString(),
                })
                .select()
                .single();

              if (dbError) throw dbError;

              updateFileProgress(file.name, {
                progress: 100,
                status: "complete",
                fileRecord: {
                  id: fileRecord.id,
                  file_path: fileName,
                },
              });
            }
          } catch (error) {
            console.error("File upload error:", error);
            updateFileProgress(file.name, { status: "error" });
            throw error;
          }
        })
      );

      // Check if all files are complete
      if (checkAllFilesComplete()) {
        router.refresh();
        setTimeout(() => {
          handleCloseModal();
        }, 1000); // Give user a moment to see completion
      }

    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload files");
    } finally {
      setUploading(false);
    }
  };

  const getStatusText = (status: UploadProgress["status"]) => {
    switch (status) {
      case "uploading":
        return "Uploading...";
      case "converting":
        return "Converting PDF...";
      case "processing":
        return "Processing...";
      case "complete":
        return "Complete";
      case "error":
        return "Error";
      default:
        return "Processing...";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!uploading) { // Prevent closing while uploading
        setOpen(isOpen);
        if (!isOpen) {
          handleCloseModal();
        }
      }
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center mb-6">
            <InfoIcon size="16" strokeWidth={2} />
            Upload PDF documents and audio files
          </div>

          <form onSubmit={handleUpload} className="space-y-6">
            <div className="border-2 border-dashed border-accent rounded-lg p-6">
              <input
                type="file"
                onChange={handleFileChange}
                multiple
                accept=".pdf,audio/*"
                className="w-full"
                disabled={uploading}
              />
              <p className="text-sm text-muted-foreground mt-2">
                Accepted files: PDF documents and audio files
              </p>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md">
                {error}
              </div>
            )}

            {files && files.length > 0 && (
              <div className="bg-accent/50 p-3 rounded-md space-y-4">
                <h3 className="font-medium">Files:</h3>
                <div className="space-y-4">
                  {Array.from(files).map((file, i) => {
                    const progress = uploadProgress[file.name];
                    const convertedText = convertedFiles[file.name];
                    const showButtons =
                      progress?.status === "complete" && progress.fileRecord;
                    const isText = file.type.includes("pdf");

                    return (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="flex justify-between text-sm">
                              <span className="truncate max-w-[300px]">
                                {file.name}
                              </span>
                              <span className="text-muted-foreground ml-2 shrink-0">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </span>
                            </div>
                            {progress && (
                              <div className="space-y-1">
                                <Progress
                                  value={progress.progress}
                                  className="h-1"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>{getStatusText(progress.status)}</span>
                                  <span>{progress.progress}%</span>
                                </div>
                              </div>
                            )}
                          </div>
                          {showButtons && (
                            <div className="flex gap-2">
                              {isText && convertedText && (
                                <ConvertButton
                                  text={convertedText}
                                  fileName={file.name}
                                  onProgress={(progress) => {
                                    updateFileProgress(file.name, { progress });
                                  }}
                                  onComplete={() => {
                                    router.refresh();
                                  }}
                                  onError={(error) => {
                                    setError(error);
                                    updateFileProgress(file.name, {
                                      status: "error",
                                    });
                                  }}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={!files || uploading}
              className="w-full"
              size="lg"
            >
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {uploading ? "Uploading..." : "Upload Files"}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}