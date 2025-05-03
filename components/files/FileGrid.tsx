// components/files/FileGrid.tsx
import { Eye, Headphones, Trash2, FileText, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/utils/dateFormat";

interface FileGridProps {
  files: any[];
  selectedFiles: string[];
  onSelectFile: (fileId: string) => void;
  onViewFile: (file: any) => void;
  onDeleteFile: (id: string) => void;
  onConvertToSpeech: (file: any) => void;
}

export function FileGrid({ 
  files, 
  selectedFiles, 
  onSelectFile, 
  onViewFile, 
  onDeleteFile, 
  onConvertToSpeech 
}: FileGridProps) {
  // Function to get appropriate icon based on file type
  const getFileIcon = (fileType: string, originalName: string) => {
    if (originalName.toLowerCase().endsWith('.pdf')) {
      return <FileText className="h-16 w-16 text-red-500" />;
    } else if (originalName.toLowerCase().endsWith('.doc') || originalName.toLowerCase().endsWith('.docx')) {
      return <FileText className="h-16 w-16 text-blue-500" />;
    } else if (originalName.toLowerCase().endsWith('.txt')) {
      return <File className="h-16 w-16 text-gray-500" />;
    } else {
      return <File className="h-16 w-16 text-gray-500" />;
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-6">
      {files.map((file) => (
        <div 
          key={file.id} 
          className="border rounded-lg overflow-hidden hover:shadow-md transition-all group"
        >
          <div className="relative">
            <div className="absolute top-2 left-2 z-10">
              <Checkbox 
                checked={selectedFiles.includes(file.id)}
                onCheckedChange={() => onSelectFile(file.id)}
                className="bg-background/80 backdrop-blur-sm"
              />
            </div>
            <div className="h-40 flex items-center justify-center bg-accent/20 p-8">
              {getFileIcon(file.file_type || '', file.original_name || '')}
            </div>
          </div>
          <div className="p-3">
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-medium truncate flex-1" title={file.displayName || file.original_name}>
                {file.displayName || file.original_name}
              </h3>
              <Badge variant="outline" className="ml-2 shrink-0">
                {file.audio_file_path ? "AUDIO" : "TEXT"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Added on {formatDate(file.created_at)}
            </p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {file.character_count ? `${file.character_count} chars` : ""}
              </p>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onViewFile(file)}
                  title="View content"
                  className="h-7 w-7 p-0"
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onConvertToSpeech(file)}
                  title="Convert to speech"
                  className="h-7 w-7 p-0"
                >
                  <Headphones className="h-3.5 w-3.5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onDeleteFile(file.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                  title="Delete file"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}