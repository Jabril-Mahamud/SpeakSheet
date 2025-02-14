// components/FileUploadForm.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InfoIcon, Upload, Loader2 } from "lucide-react";
import { useFileUpload } from "@/hooks/useFileUpload";
import { toast } from "@/hooks/use-toast";
import { FileUploadFormProps } from "@/utils/types";



export function FileUploadForm({ onSuccess }: FileUploadFormProps) {
  const { files, setFiles, uploading, handleUpload, validateFiles } = useFileUpload();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const error = await handleUpload();
      if (error) {
        setError(error);
        toast({
          title: "Error",
          description: error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Files uploaded successfully",
        });
        onSuccess?.();
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError("An unexpected error occurred");
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    // Clear previous error state
    setError(null);

    // Validate files
    const validationError = validateFiles(selectedFiles);
    if (validationError) {
      setError(validationError);
      toast({
        title: "Error",
        description: validationError,
        variant: "destructive",
      });
      e.target.value = ''; // Reset the input
      return;
    }

    setFiles(selectedFiles);
  };

  return (
    <div className="w-full max-w-xl">
      <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center mb-6">
        <InfoIcon size="16" strokeWidth={2} />
        Upload PDF documents and audio files
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
            Accepted files: PDF documents and audio files (max 50MB per file)
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