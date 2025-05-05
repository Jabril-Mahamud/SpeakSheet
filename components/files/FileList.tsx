import { Eye, Headphones, Trash2, FileText, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/utils/dateFormat";

interface FileListProps {
  files: any[];
  selectedFiles: string[];
  onSelectFile: (fileId: string) => void;
  onViewFile: (file: any) => void;
  onDeleteFile: (id: string) => void;
  onConvertToSpeech: (file: any) => void;
}

export function FileList({ 
  files, 
  selectedFiles, 
  onSelectFile, 
  onViewFile, 
  onDeleteFile, 
  onConvertToSpeech 
}: FileListProps) {
  // Function to get appropriate icon based on file type
  const getFileIcon = (fileType: string, originalName: string) => {
    if (originalName.toLowerCase().endsWith('.pdf')) {
      return <FileText className="h-8 w-8 text-red-500" />;
    } else if (originalName.toLowerCase().endsWith('.doc') || originalName.toLowerCase().endsWith('.docx')) {
      return <FileText className="h-8 w-8 text-blue-500" />;
    } else if (originalName.toLowerCase().endsWith('.txt')) {
      return <File className="h-8 w-8 text-gray-500" />;
    } else {
      return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-3 px-6">
      {files.map((file) => (
        <div 
          key={file.id} 
          className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/10 transition-colors group"
        >
          <Checkbox 
            checked={selectedFiles.includes(file.id)}
            onCheckedChange={() => onSelectFile(file.id)}
            className="mr-1"
          />
          {getFileIcon(file.file_type || '', file.original_name || '')}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium truncate">{file.displayName || file.original_name}</h3>
                <p className="text-sm text-muted-foreground">
                  Added on {formatDate(file.created_at)}
                  {file.character_count && ` • ${file.character_count} characters`}
                </p>
              </div>
              <Badge variant="outline" className="ml-2">
                {file.audio_file_path ? "AUDIO" : "TEXT"}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-1 lg:opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onViewFile(file)}
              title="View content"
              className="h-8 w-8 p-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onConvertToSpeech(file)}
              title="Convert to speech"
              className="h-8 w-8 p-0"
            >
              <Headphones className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onDeleteFile(file.id)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
              title="Delete file"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
