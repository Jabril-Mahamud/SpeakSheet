
// components/files/NoFilesPlaceholder.tsx
import { FileText, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NoFilesPlaceholderProps {
  isEmpty: boolean;
  onUpload: () => void;
}

export function NoFilesPlaceholder({ isEmpty, onUpload }: NoFilesPlaceholderProps) {
  return (
    <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed mx-6">
      <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
      <h3 className="mt-4 text-lg font-medium">No files found</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {isEmpty 
          ? "Upload a PDF or text file to get started" 
          : "Try adjusting your search or filters"}
      </p>
      {isEmpty && (
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={onUpload}
        >
          <FileUp className="mr-2 h-4 w-4" />
          Upload a File
        </Button>
      )}
    </div>
  );
}