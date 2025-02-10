import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Headphones, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { createClient } from "@/utils/supabase/client";

interface ConvertButtonProps {
  text: string;
  fileName: string;
  disabled?: boolean;
  iconOnly?: boolean;
  onProgress: (progress: number) => void;
  onComplete: () => void;
  onError: (error: string) => void;
}

interface TTSSettings {
  tts_service: 'Amazon' | 'ElevenLabs';
  api_key?: string;
  aws_polly_voice?: string;
  elevenlabs_voice_id?: string;
  elevenlabs_stability?: number;
  elevenlabs_similarity_boost?: number;
}

export function ConvertButton(props: ConvertButtonProps) {
  const [converting, setConverting] = useState(false);
  const [settings, setSettings] = useState<TTSSettings | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function fetchSettings() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
  
      const { data } = await supabase
        .from('user_tts_settings')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      setSettings(data || {
        tts_service: 'Amazon',
        aws_polly_voice: 'Joanna'
      });
    }
    fetchSettings();
  }, [supabase]);

  const getEndpointForService = (service: string) => {
    switch (service) {
      case 'ElevenLabs':
        return "/api/convert-audio/elevenlabs";
      case 'Amazon':
      default:
        return "/api/convert-audio/polly";
    }
  };

  const getVoiceIdForService = (settings: TTSSettings) => {
    switch (settings.tts_service) {
      case 'ElevenLabs':
        return settings.elevenlabs_voice_id;
      case 'Amazon':
      default:
        return settings.aws_polly_voice;
    }
  };

  const handleConvert = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!settings) return;

    try {
      setConverting(true);
      props.onProgress(33);

      // Strip the extension and pass the original filename
      const baseName = props.fileName.replace(/\.[^/.]+$/, '');

      const endpoint = getEndpointForService(settings.tts_service);
      const voiceId = getVoiceIdForService(settings);

      const requestBody = {
        text: props.text,
        voiceId,
        originalFilename: baseName,
        ...(settings.tts_service === 'ElevenLabs' && {
          apiKey: settings.api_key,
          stability: settings.elevenlabs_stability,
          similarityBoost: settings.elevenlabs_similarity_boost
        })
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Conversion failed' }));
        
        // Handle specific error cases
        if (response.status === 401) {
          throw new Error('Authentication required. Please check your API key.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        
        throw new Error(errorData.error || 'Conversion failed');
      }

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

  const getButtonTitle = () => {
    if (!settings) return "Loading settings...";
    if (converting) return "Converting...";
    return `Convert to Audio using ${settings.tts_service}`;
  };

  return (
    <Button
      onClick={handleConvert}
      disabled={props.disabled || converting || !settings}
      variant={props.iconOnly ? "ghost" : "secondary"}
      size={props.iconOnly ? "icon" : "sm"}
      className={!props.iconOnly ? "ml-2" : ""}
      type="button"
      title={props.iconOnly ? getButtonTitle() : undefined}
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