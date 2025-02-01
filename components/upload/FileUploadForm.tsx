"use client";

import { Button } from "@/components/ui/button";
import { InfoIcon, Upload, Loader2 } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { convertPdfToText } from "@/utils/fileUtils";

interface FileUploadFormProps {
  onSuccess?: () => void;
}

export function FileUploadForm({ onSuccess }: FileUploadFormProps) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    for (const file of Array.from(selectedFiles)) {
      if (!file.type.includes("pdf") && !file.type.includes("audio")) {
        setError("Only PDF and audio files are allowed");
        return;
      }
    }

    setFiles(selectedFiles);
    setError(null);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files?.length) {
      setError("Please select files to upload");
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      await Promise.all(Array.from(files).map(async (file) => {
        try {
          if (file.type.includes("pdf")) {
            const textContent = await convertPdfToText(file);
            const textBlob = new Blob([textContent], { type: "text/plain" });
            const textFileName = file.name.replace(".pdf", ".txt");
            const textFile = new File([textBlob], textFileName, { type: "text/plain" });
            const filePath = `${user.id}/text/${crypto.randomUUID()}.txt`;

            const { error: uploadError } = await supabase.storage
              .from("files")
              .upload(filePath, textFile);

            if (uploadError) throw uploadError;

            const { error: dbError } = await supabase
              .from("files")
              .insert({
                id: crypto.randomUUID(),
                user_id: user.id,
                file_path: filePath,
                file_type: "text/plain",
                original_name: textFileName,
                created_at: new Date().toISOString(),
              });

            if (dbError) throw dbError;
          } else {
            const fileExt = file.name.split(".").pop();
            const filePath = `${user.id}/audio/${crypto.randomUUID()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
              .from("files")
              .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { error: dbError } = await supabase
              .from("files")
              .insert({
                id: crypto.randomUUID(),
                user_id: user.id,
                file_path: filePath,
                file_type: file.type,
                original_name: file.name,
                created_at: new Date().toISOString(),
              });

            if (dbError) throw dbError;
          }
        } catch (error) {
          console.error("File upload error:", error);
          throw error;
        }
      }));

      router.refresh();
      onSuccess?.();
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload files");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-xl">
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
          <div className="bg-accent/50 p-3 rounded-md">
            <h3 className="font-medium mb-2">Selected files:</h3>
            <ul className="list-disc pl-5">
              {Array.from(files).map((file, i) => (
                <li key={i} className="text-sm">
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </li>
              ))}
            </ul>
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
  );
}