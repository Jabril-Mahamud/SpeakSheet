"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, FileText, Upload, FileUp, AlertCircle, File, Eye, Headphones } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/utils/dateFormat";
import { FileCard } from "@/components/files/Filecard";


export default function FilesPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewFile, setViewFile] = useState<any | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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

  // Process file names to handle duplicates and clean extensions
  const processFileNames = (files: any[]) => {
    // Create a map to track name occurrences
    const nameCount: Record<string, number> = {};
    
    return files.map(file => {
      // Get base name without extension
      const originalName = file.original_name || '';
      const lastDotIndex = originalName.lastIndexOf('.');
      const baseName = lastDotIndex > 0 ? originalName.substring(0, lastDotIndex) : originalName;
      
      // Track this name in our counter
      nameCount[baseName] = (nameCount[baseName] || 0) + 1;
      
      // Create display name with numbering for duplicates
      const count = nameCount[baseName];
      const displayName = count > 1 ? `${baseName}-${count}` : baseName;
      
      return {
        ...file,
        displayName
      };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;
    
    setUploading(true);
    setError(null);
    
    const formData = new FormData();
    
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append('files', selectedFiles[i]);
    }
    
    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
      
      const data = await response.json();
      toast({
        title: "Files uploaded successfully",
        description: `${data.fileIds.length} file(s) uploaded and processed.`,
      });
      
      // Refresh file list
      fetchFiles();
      
    } catch (error) {
      console.error('Error uploading files:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload files');
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : 'Failed to upload files',
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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

  const handleDeleteFile = async (id: string) => {
    try {
      const response = await fetch(`/api/files/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete file');
      }
      
      // Remove file from state
      setFiles(files.filter(file => file.id !== id));
      
      toast({
        title: "File deleted",
        description: "The file has been successfully deleted.",
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete the file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleConvertToSpeech = (file: any) => {
    // Navigate to chat page with file content
    router.push(`/chat?fileId=${file.id}`);
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
    <div className="container max-w-6xl py-8">
      <Card className="border-2 shadow-lg">
        <CardHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">My Files</CardTitle>
              <CardDescription>
                Upload, view, and convert your files to speech
              </CardDescription>
            </div>
            <div>
              <Input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                onChange={handleFileUpload} 
                accept=".pdf,.txt,.doc,.docx"
                multiple
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="relative"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" /> 
                    Upload Files
                  </>
                )}
              </Button>
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

          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All Files</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="text">Text</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-6">
              {files.length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">No files uploaded yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Upload a PDF or text file to get started
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileUp className="mr-2 h-4 w-4" />
                    Upload a File
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {files.map((file) => (
                    <FileCard 
                      key={file.id} 
                      file={file} 
                      onView={() => handleViewFile(file)}
                      onDelete={() => handleDeleteFile(file.id)}
                      onConvert={() => handleConvertToSpeech(file)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="documents" className="mt-6">
              {files.filter(file => 
                file.original_name?.toLowerCase().endsWith('.pdf') || 
                file.original_name?.toLowerCase().endsWith('.doc') ||
                file.original_name?.toLowerCase().endsWith('.docx')
              ).length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">No documents uploaded yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Upload PDF files to get started
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileUp className="mr-2 h-4 w-4" />
                    Upload a Document
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {files
                    .filter(file => 
                      file.original_name?.toLowerCase().endsWith('.pdf') || 
                      file.original_name?.toLowerCase().endsWith('.doc') ||
                      file.original_name?.toLowerCase().endsWith('.docx')
                    )
                    .map((file) => (
                      <FileCard 
                        key={file.id} 
                        file={file} 
                        onView={() => handleViewFile(file)}
                        onDelete={() => handleDeleteFile(file.id)}
                        onConvert={() => handleConvertToSpeech(file)}
                      />
                    ))
                  }
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="text" className="mt-6">
              {files.filter(file => 
                file.original_name?.toLowerCase().endsWith('.txt')
              ).length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
                  <File className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">No text files uploaded yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Upload text files to get started
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileUp className="mr-2 h-4 w-4" />
                    Upload a Text File
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {files
                    .filter(file => file.original_name?.toLowerCase().endsWith('.txt'))
                    .map((file) => (
                      <FileCard 
                        key={file.id} 
                        file={file} 
                        onView={() => handleViewFile(file)}
                        onDelete={() => handleDeleteFile(file.id)}
                        onConvert={() => handleConvertToSpeech(file)}
                      />
                    ))
                  }
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* File Content Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {viewFile?.displayName || viewFile?.original_name || "File Content"}
            </DialogTitle>
            <DialogDescription>
              Uploaded on {viewFile?.created_at ? formatDate(viewFile.created_at) : "Unknown date"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden border rounded-md">
            <ScrollArea className="h-full max-h-[calc(80vh-10rem)]">
              {fileContent === null ? (
                <div className="flex items-center justify-center h-full p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <pre className="p-4 text-sm whitespace-pre-wrap break-words font-mono">
                  {fileContent}
                </pre>
              )}
            </ScrollArea>
          </div>
          
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => handleConvertToSpeech(viewFile)}
            >
              <Headphones className="mr-2 h-4 w-4" /> 
              Convert to Speech
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}