"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { InfoIcon, Upload, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface UploadProgress {
  fileName: string;
  progress: number;
  status: "uploading" | "converting" | "processing" | "complete" | "error";
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
  const [uploadProgress, setUploadProgress] = useState<
    Record<string, UploadProgress>
  >({});
  const supabase = createClient();
  const router = useRouter();

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

    // Create unique names for files
    const uniqueFiles = Array.from(selectedFiles).reduce<Record<string, File>>(
      (acc, file) => {
        let uniqueName = file.name;
        let counter = 1;

        while (acc[uniqueName]) {
          const nameParts = file.name.split(".");
          const ext = nameParts.pop();
          const baseName = nameParts.join(".");
          uniqueName = `${baseName} (${counter}).${ext}`;
          counter++;
        }

        acc[uniqueName] = file;
        return acc;
      },
      {}
    );

    setFiles(selectedFiles);
    setError(null);
    setUploadProgress({});
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

      const uploadPromises = Array.from(files).map(async (file) => {
        try {
          if (file.type.includes("pdf")) {
            const textContent = await convertPdfToText(file);
            const textBlob = new Blob([textContent], { type: "text/plain" });
            const textFileName = file.name.replace(".pdf", ".txt");
            const textFile = new File([textBlob], textFileName, {
              type: "text/plain",
            });

            const fileName = `${Math.random()}.txt`;
            const filePath = `${user.id}/text/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from("files")
              .upload(filePath, textFile);

            if (uploadError) throw uploadError;

            const { error: dbError } = await supabase.from("files").insert({
              id: crypto.randomUUID(),
              user_id: user.id,
              file_path: filePath,
              file_type: "text/plain",
              original_name: textFileName,
              created_at: new Date().toISOString(),
            });

            if (dbError) throw dbError;

            updateFileProgress(file.name, {
              progress: 100,
              status: "complete",
            });
          } else {
            updateFileProgress(file.name, { status: "uploading" });
            const fileExt = file.name.split(".").pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${user.id}/audio/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from("files")
              .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { error: dbError } = await supabase.from("files").insert({
              id: crypto.randomUUID(),
              user_id: user.id,
              file_path: filePath,
              file_type: file.type,
              original_name: file.name,
              created_at: new Date().toISOString(),
            });

            if (dbError) throw dbError;

            updateFileProgress(file.name, {
              progress: 100,
              status: "complete",
            });
          }
        } catch (error) {
          console.error("File upload error:", error);
          updateFileProgress(file.name, { status: "error" });
          throw error;
        }
      });

      await Promise.all(uploadPromises);

      // Wait a moment to show completion state before closing
      setTimeout(() => {
        router.refresh();
        setOpen(false);
        setFiles(null);
        setUploadProgress({});

        // Additional refresh after a delay
        setTimeout(() => {
          router.refresh();
        }, 500);
      }, 1000);
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
    <Dialog open={open} onOpenChange={setOpen}>
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
                    return (
                      <div key={i} className="space-y-2">
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
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={!files || uploading}
              className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Upload size={16} />
              )}
              {uploading ? "Uploading..." : "Upload Files"}
            </button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
