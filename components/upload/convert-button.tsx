import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Headphones, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { createClient } from "@/utils/supabase/client";

interface ConvertButtonProps {
  text: string;
  fileName: string;
  onProgress: (progress: number) => void;
  onComplete: () => void;
  onError: (error: string) => void;
  disabled?: boolean;
  iconOnly?: boolean;
}

export function ConvertButton(props: ConvertButtonProps) {
  const [converting, setConverting] = useState(false);
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function fetchVoice() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
  
      const { data } = await supabase
        .from('user_tts_settings')
        .select('aws_polly_voice')
        .eq('id', user.id)
        .maybeSingle();
      
      setVoiceId(data?.aws_polly_voice || 'Joanna');
    }
    fetchVoice();
  }, [supabase]);

  const handleConvert = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      setConverting(true);
      props.onProgress(33);

      // Strip the extension and pass the original filename
      const baseName = props.fileName.replace(/\.[^/.]+$/, '');

      const response = await fetch("/api/convert-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: props.text,
          voiceId,
          originalFilename: baseName
        }),
      });

      if (!response.ok) throw new Error(await response.text());

      props.onProgress(66);
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      props.onProgress(100);
      
      router.refresh();
      toast({
        title: "Success",
        description: "Audio file created successfully. You can now find it in your files.",
      });
      
      props.onComplete();
    } catch (error) {
      console.error("Conversion error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to convert to audio";
      props.onError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setConverting(false);
    }
  };

  return (
    <Button
      onClick={handleConvert}
      disabled={props.disabled || converting}
      variant={props.iconOnly ? "ghost" : "secondary"}
      size={props.iconOnly ? "icon" : "sm"}
      className={!props.iconOnly ? "ml-2" : ""}
      type="button"
      title={props.iconOnly ? "Convert to Audio" : undefined}
    >
      {converting ? (
        <Loader2 
          size={16} 
          className={`${props.iconOnly ? "" : "mr-2"} animate-spin`}
        />
      ) : (
        <Headphones 
          size={16} 
          className={props.iconOnly ? "" : "mr-2"}
        />
      )}
      {!props.iconOnly && (converting ? "Converting..." : "Convert to Audio")}
    </Button>
  );
}