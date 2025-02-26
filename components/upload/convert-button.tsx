import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Headphones, Loader2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { createClient } from "@/utils/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [hasRateLimitError, setHasRateLimitError] = useState(false);
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
    
    if (hasRateLimitError && settings.tts_service === 'Amazon' && !settings.api_key) {
      setShowLimitDialog(true);
      return;
    }

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
          setHasRateLimitError(true);
          throw new Error('Usage limit exceeded. Please add custom AWS credentials or try again next month.');
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
      
      if (errorMessage.includes('Usage limit exceeded')) {
        setShowLimitDialog(true);
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setConverting(false);
    }
  };

  const getButtonTitle = () => {
    if (hasRateLimitError && settings?.tts_service === 'Amazon' && !settings?.api_key) {
      return "Usage limit exceeded";
    }
    if (!settings) return "Loading settings...";
    if (converting) return "Converting...";
    return `Convert to Audio using ${settings.tts_service}`;
  };

  const ButtonContent = () => (
    <>
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
      {!props.iconOnly && (
        hasRateLimitError && settings?.tts_service === 'Amazon' && !settings?.api_key 
          ? "Usage Limit Exceeded" 
          : converting 
            ? "Converting..." 
            : "Convert to Audio"
      )}
    </>
  );

  // If in icon-only mode, wrap with tooltip
  if (props.iconOnly) {
    return (
      <>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleConvert}
                disabled={props.disabled || converting || !settings}
                variant="ghost"
                size="icon"
                type="button"
                title={getButtonTitle()}
              >
                <ButtonContent />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {hasRateLimitError && settings?.tts_service === 'Amazon' && !settings?.api_key
                ? "Usage limit exceeded"
                : getButtonTitle()}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <LimitExceededDialog 
          open={showLimitDialog} 
          onOpenChange={setShowLimitDialog} 
        />
      </>
    );
  }

  return (
    <>
      <Button
        onClick={handleConvert}
        disabled={props.disabled || converting || !settings}
        variant="secondary"
        size="sm"
        className="ml-2"
        type="button"
      >
        <ButtonContent />
      </Button>

      <LimitExceededDialog 
        open={showLimitDialog} 
        onOpenChange={setShowLimitDialog} 
      />
    </>
  );
}

// Component for the limit exceeded dialog
function LimitExceededDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Usage Limit Exceeded</DialogTitle>
          <DialogDescription>
            You have exceeded your monthly character limit for text-to-speech conversions.
          </DialogDescription>
        </DialogHeader>
        
        <Alert variant="destructive" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Cannot Convert Text to Audio</AlertTitle>
          <AlertDescription>
            To continue using the text-to-speech feature, please add custom AWS credentials
            or wait until your usage resets next month.
          </AlertDescription>
        </Alert>
        
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            You can add your own AWS credentials in the account settings to
            bypass this limitation and use your own AWS Polly quota.
          </p>
        </div>
        
        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button 
            variant="default" 
            className="ml-2"
            onClick={() => {
              onOpenChange(false);
              router.push("/protected");
            }}
          >
            Go to Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}