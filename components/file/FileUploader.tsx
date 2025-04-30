// components/file/FileUploader.tsx
"use client";

import { useState } from 'react';
import { UploadCloud, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

export default function FileUploader({ onFileUploaded }: { onFileUploaded: (fileId: string) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload a PDF file."
      });
      return;
    }

    try {
      setIsUploading(true);
      
      // Simulate progress (in a real implementation, you'd use XHR or fetch with progress monitoring)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const newProgress = prev + 5;
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 100);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const { fileId } = await response.json();
      
      toast({
        title: "File uploaded",
        description: "Your PDF was uploaded successfully."
      });
      
      onFileUploaded(fileId);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : 'An error occurred while uploading the file'
      });
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  return (
    <div 
      className={`border-2 border-dashed rounded-lg p-8 text-center ${
        isDragging ? 'border-primary bg-primary/5' : 'border-border'
      } transition-colors`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="rounded-full bg-primary/10 p-4">
          <FileText className="h-8 w-8 text-primary" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Upload PDF File</h3>
          <p className="text-sm text-muted-foreground">
            Drag and drop your PDF file here, or click to browse
          </p>
        </div>
        
        <Button 
          variant="outline" 
          onClick={() => document.getElementById('file-upload')?.click()}
          disabled={isUploading}
        >
          <UploadCloud className="mr-2 h-4 w-4" />
          Select PDF File
        </Button>
        
        <input 
          id="file-upload" 
          type="file" 
          accept=".pdf" 
          className="hidden" 
          onChange={handleFileChange}
          disabled={isUploading}
        />
        
        {isUploading && (
          <div className="w-full space-y-2">
            <Progress value={uploadProgress} className="w-full" />
            <p className="text-sm text-muted-foreground">Uploading... {uploadProgress}%</p>
          </div>
        )}
      </div>
    </div>
  );
}