// components/FileCard.tsx
import React from 'react';
import { Button } from "@/components/ui/button";
import { FileText, File, Eye, Headphones } from "lucide-react";
import { formatDate } from "@/utils/dateFormat";

// This component will display files with proper naming for duplicates
function FileCard({ 
  file, 
  fileNames,
  onView, 
  onDelete, 
  onConvert 
}: { 
  file: any;
  fileNames: Record<string, number>;
  onView: () => void; 
  onDelete: () => void; 
  onConvert: () => void; 
}) {
  // Get base name without extension
  const getBaseName = (filename: string) => {
    return filename.split('.')[0];
  };

  // Get display name with counter if needed
  const getDisplayName = () => {
    const originalName = file.original_name;
    const baseName = getBaseName(originalName);
    
    // If this is the first file with this name, just display the original name
    if (fileNames[baseName] === 1) {
      return originalName;
    }
    
    // Otherwise, determine which number this file is
    const count = Object.values(fileNames).filter(id => id === file.id).length + 1;
    const extension = originalName.split('.').pop();
    
    return `${baseName}-${count}.${extension}`;
  };
  
  // Function to get file icon based on file type
  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) {
      return <FileText className="h-8 w-8 text-red-500" />;
    } else if (fileType.includes('doc')) {
      return <FileText className="h-8 w-8 text-blue-500" />;
    } else {
      return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        {getFileIcon(file.file_type || '')}
        <div>
          <h3 className="font-medium">{getDisplayName()}</h3>
          <p className="text-sm text-muted-foreground">
            Uploaded on {formatDate(file.created_at)}
            {file.character_count && ` • ${file.character_count} characters`}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onView}
          title="View content"
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onConvert}
          title="Convert to speech"
        >
          <Headphones className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onDelete}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          title="Delete file"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="lucide lucide-trash-2"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            <line x1="10" x2="10" y1="11" y2="17" />
            <line x1="14" x2="14" y1="11" y2="17" />
          </svg>
        </Button>
      </div>
    </div>
  );
}

export default FileCard;