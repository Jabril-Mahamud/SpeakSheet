// app/files/page.tsx
"use client";

import { useState, useEffect } from "react";
import { FilesBrowser } from "@/components/files/FilesBrowser";
import { FileViewDialog } from "@/components/files/FileViewDialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { processFileNames } from "@/utils/lib/file-utils";

export default function FilesLibraryPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewFile, setViewFile] = useState<any | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch files on component mount
  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/files');
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }
      const data = await response.json();
      
      // Process files to clean up display names
      const processedFiles = processFileNames(data.files || []);
      setFiles(processedFiles);
    } catch (error) {
      console.error('Error fetching files:', error);
      setError('Failed to load your files. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpdated = () => {
    fetchFiles();
  };

  const handleViewFile = async (file: any) => {
    try {
      setViewFile(file);
      setDialogOpen(true);
      setFileContent(null); // Reset content
      
      const response = await fetch(`/api/files/${file.id}/content`);
      if (!response.ok) {
        throw new Error('Failed to fetch file content');
      }
      
      const data = await response.json();
      setFileContent(data.content);
    } catch (error) {
      console.error('Error fetching file content:', error);
      toast({
        title: "Error",
        description: "Failed to load file content",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-lg font-medium">Loading your files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl py-8">
      <Card className="border shadow-lg">
        <CardHeader className="border-b pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl mb-1">My Library</CardTitle>
              <CardDescription>
                Upload, search, and organize your text documents
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <FilesBrowser 
            files={files} 
            onViewFile={handleViewFile}
            onFileUpdated={handleFileUpdated}
          />
        </CardContent>
      </Card>

      <FileViewDialog
        file={viewFile}
        content={fileContent}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}