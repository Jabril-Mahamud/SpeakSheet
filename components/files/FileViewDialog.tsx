// components/files/FileViewDialog.tsx
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader,
  DialogTitle,
  DialogDescription 
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Headphones } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/utils/dateFormat";

interface FileViewDialogProps {
  file: any;
  content: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FileViewDialog({ file, content, open, onOpenChange }: FileViewDialogProps) {
  const router = useRouter();

  const handleConvertToSpeech = () => {
    if (file) {
      router.push(`/chat?fileId=${file.id}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {file?.displayName || file?.original_name || "File Content"}
          </DialogTitle>
          <DialogDescription>
            Uploaded on {file?.created_at ? formatDate(file.created_at) : "Unknown date"}
            {file?.original_name && ` • Originally a ${file.extension?.toUpperCase() || ''} file`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden border rounded-md">
          <ScrollArea className="h-full max-h-[calc(80vh-10rem)]">
            {content === null ? (
              <div className="flex items-center justify-center h-full p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <pre className="p-4 text-sm whitespace-pre-wrap break-words font-mono">
                {content}
              </pre>
            )}
          </ScrollArea>
        </div>
        
        <DialogFooter className="flex justify-end space-x-2 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            onClick={handleConvertToSpeech}
          >
            <Headphones className="mr-2 h-4 w-4" /> 
            Convert to Speech
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}