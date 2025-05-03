import { useCallback, useState } from "react";
import { toast } from "./use-toast";

export function useFileContent() {
  const [viewFile, setViewFile] = useState<FileItem | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);

  const viewFileContent = useCallback(async (file: FileItem) => {
    try {
      setViewFile(file);
      setDialogOpen(true);
      setFileContent(null);
      setContentLoading(true);

      const response = await fetch(`/api/files/${file.id}/content`);
      if (!response.ok) {
        throw new Error("Failed to fetch file content");
      }

      const data = await response.json();
      setFileContent(data.content);
    } catch (error) {
      console.error("Error fetching file content:", error);
      toast({
        title: "Error",
        description: "Failed to load file content",
        variant: "destructive",
      });
    } finally {
      setContentLoading(false);
    }
  }, []);

  return {
    viewFile,
    fileContent,
    dialogOpen,
    setDialogOpen,
    contentLoading,
    viewFileContent,
  };
}
