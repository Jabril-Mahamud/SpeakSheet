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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Loader2, Headphones } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { formatDate } from "@/utils/dateFormat";
import { toast } from "@/hooks/use-toast";

interface FileViewDialogProps {
  file: any;
  content: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FileViewDialog({ file, content, open, onOpenChange }: FileViewDialogProps) {
  const supabase = createClient();
  
  const [converting, setConverting] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState("Amazon");
  const [selectedVoice, setSelectedVoice] = useState("Joanna");

  const handleConvertToSpeech = async () => {
    if (!file || !content) return;
    
    try {
      setConverting(true);
      setAudioUrl(null);
      
      // Prepare request body based on selected service
      const requestBody = {
        text: content,
        voiceId: selectedVoice,
        originalFilename: `file_${file.id}`,
        ...(selectedService === "ElevenLabs" && {
          // Default values for stability and similarity boost
          stability: 0.5,
          similarityBoost: 0.75,
        }),
      };
      
      // Determine which endpoint to use
      const endpoint = selectedService === "ElevenLabs" 
        ? "/api/convert-audio/elevenlabs" 
        : "/api/convert-audio/polly";
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Conversion failed");
      }
      
      const data = await response.json();
      
      // Fetch the file path to create a signed URL
      const { data: fileData, error: fileError } = await supabase
        .from('files')
        .select('file_path')
        .eq('id', data.fileId)
        .single();
        
      if (fileError) throw new Error("Failed to retrieve file information");
      
      // Create a signed URL for the audio file
      const { data: signedUrlData } = await supabase.storage
        .from('files')
        .createSignedUrl(fileData.file_path, 3600);
        
      if (!signedUrlData?.signedUrl) {
        throw new Error("Failed to get audio URL");
      }
      
      setAudioUrl(signedUrlData.signedUrl);
      toast({
        title: "Conversion Complete",
        description: "Your text has been converted to speech successfully!",
      });
      
    } catch (error) {
      console.error("Error converting to speech:", error);
      toast({
        title: "Conversion Failed",
        description: error instanceof Error ? error.message : "Failed to convert text to speech",
        variant: "destructive",
      });
    } finally {
      setConverting(false);
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
          <ScrollArea className="h-full max-h-[calc(80vh-13rem)]">
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
        
        {audioUrl && (
          <div className="mt-4 p-4 bg-accent/20 rounded-md">
            <audio 
              src={audioUrl} 
              controls 
              className="w-full" 
              autoPlay
            />
          </div>
        )}
        
        <DialogFooter className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="flex flex-1 flex-col sm:flex-row gap-2">
            <Select
              value={selectedService}
              onValueChange={setSelectedService}
              disabled={converting}
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Amazon">AWS Polly</SelectItem>
                <SelectItem value="ElevenLabs">ElevenLabs</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={selectedVoice}
              onValueChange={setSelectedVoice}
              disabled={converting}
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Voice" />
              </SelectTrigger>
              <SelectContent>
                {selectedService === "Amazon" ? (
                  <>
                    <SelectItem value="Joanna">Joanna (Female)</SelectItem>
                    <SelectItem value="Matthew">Matthew (Male)</SelectItem>
                    <SelectItem value="Salli">Salli (Female)</SelectItem>
                    <SelectItem value="Justin">Justin (Male)</SelectItem>
                    <SelectItem value="Joey">Joey (Male)</SelectItem>
                    <SelectItem value="Kendra">Kendra (Female)</SelectItem>
                    <SelectItem value="Kimberly">Kimberly (Female)</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="21m00Tcm4TlvDq8ikWAM">Rachel (Female)</SelectItem>
                    <SelectItem value="AZnzlk1XvdvUeBnXmlld">Domi (Female)</SelectItem>
                    <SelectItem value="EXAVITQu4vr4xnSDxMaL">Bella (Female)</SelectItem>
                    <SelectItem value="VR6AewLTigWG4xSOukaG">Adam (Male)</SelectItem>
                    <SelectItem value="pNInz6obpgDQGcFmaJgB">Sam (Male)</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button
              onClick={handleConvertToSpeech}
              disabled={converting || !content}
            >
              {converting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                  Converting...
                </>
              ) : (
                <>
                  <Headphones className="mr-2 h-4 w-4" /> 
                  Convert to Speech
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}