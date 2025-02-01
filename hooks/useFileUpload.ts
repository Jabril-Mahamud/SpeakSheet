// hooks/useFileUpload.ts
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { UploadProgress } from "@/utils/types";


export function useFileUpload() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});
  const [convertedFiles, setConvertedFiles] = useState<Record<string, string>>({});
  const supabase = createClient();

  const updateFileProgress = (fileName: string, updates: Partial<UploadProgress>) => {
    setUploadProgress((prev) => ({
      ...prev,
      [fileName]: { ...prev[fileName], ...updates },
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

      if (!response.ok) throw new Error("Conversion failed");

      const { text } = await response.json();
      updateFileProgress(file.name, { progress: 66, status: "processing" });
      return text;
    } catch (error) {
      console.error("PDF conversion error:", error);
      updateFileProgress(file.name, { status: "error" });
      throw new Error("Failed to convert PDF to text");
    }
  };

  return {
    files,
    setFiles,
    uploading,
    setUploading,
    error,
    setError,
    uploadProgress,
    convertedFiles,
    setConvertedFiles,
    updateFileProgress,
    convertPdfToText,
    supabase,
  };
}