'use client';
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/utils/supabase/client";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Voice } from "@/utils/types";

export default function TtsSettingsForm() {
  const [settings, setSettings] = useState({
    tts_service: "Amazon",
    api_key: "",
    aws_polly_voice: process.env.NEXT_PUBLIC_AWS_POLLY_VOICE || "Joanna",
    elevenlabs_voice_id: "",
    elevenlabs_stability: 0.5,
    elevenlabs_similarity_boost: 0.75,
    custom_voice_id: "",
  });
  const [voices, setVoices] = useState<Record<string, any[]>>({});
  const [elevenLabsVoices, setElevenLabsVoices] = useState<Voice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (settings.tts_service === "Amazon") {
      fetchPollyVoices();
    } else if (settings.tts_service === "ElevenLabs" && settings.api_key) {
      fetchElevenLabsVoices();
    }
  }, [settings.tts_service, settings.api_key]);

  async function fetchElevenLabsVoices() {
    if (!settings.api_key) return;
    
    setIsLoadingVoices(true);
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'Accept': 'application/json',
          'xi-api-key': settings.api_key
        }
      });

      if (!response.ok) throw new Error('Failed to fetch voices');

      const data = await response.json();
      setElevenLabsVoices(data.voices);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error loading ElevenLabs voices",
        description: "Please check your API key and try again"
      });
    } finally {
      setIsLoadingVoices(false);
    }
  }

  async function fetchPollyVoices() {
    try {
      const response = await fetch("/api/voices/polly");
      if (!response.ok) throw new Error();
      const data = await response.json();
      setVoices(data);
    } catch {
      toast({
        variant: "destructive",
        title: "Error loading Polly voices",
      });
    }
  }

  async function fetchSettings() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_tts_settings")
        .select('*')
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setSettings(data);
        if (data.tts_service === 'ElevenLabs' && data.api_key) {
          fetchElevenLabsVoices();
        }
      } else {
        const { error: insertError } = await supabase
          .from("user_tts_settings")
          .insert({
            id: user.id,
            tts_service: "Amazon",
            aws_polly_voice: process.env.NEXT_PUBLIC_AWS_POLLY_VOICE || "Joanna",
          });

        if (insertError) throw insertError;
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error loading settings",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSaving) return;

    if (settings.tts_service !== "Amazon" && !settings.api_key) {
      toast({
        variant: "destructive",
        title: `API key required for ${settings.tts_service}`,
      });
      return;
    }

    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error();

      // Determine which voice ID to save
      const voiceIdToSave = settings.tts_service === "ElevenLabs" 
        ? (settings.custom_voice_id || settings.elevenlabs_voice_id)
        : settings.aws_polly_voice;

      const { error } = await supabase.from("user_tts_settings").upsert({
        id: user.id,
        ...settings,
        [settings.tts_service === "ElevenLabs" ? "elevenlabs_voice_id" : "aws_polly_voice"]: voiceIdToSave,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({ title: "Settings saved" });
    } catch {
      toast({
        variant: "destructive",
        title: "Error saving settings",
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label>TTS Service</Label>
        <Select
          value={settings.tts_service}
          onValueChange={(value) =>
            setSettings((prev) => ({ ...prev, tts_service: value }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Amazon">Amazon Polly (Default)</SelectItem>
            <SelectItem value="ElevenLabs">ElevenLabs</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>
          {settings.tts_service === "Amazon"
            ? "AWS Credentials (Optional)"
            : `${settings.tts_service} API Key`}
          {settings.tts_service !== "Amazon" && (
            <span className="text-destructive"> *</span>
          )}
        </Label>
        <Input
          type="password"
          placeholder={
            settings.tts_service === "Amazon"
              ? "Leave empty to use Amazon Polly included with your account"
              : `Enter your ${settings.tts_service} API key`
          }
          value={settings.api_key}
          onChange={(e) =>
            setSettings((prev) => ({ ...prev, api_key: e.target.value }))
          }
          required={settings.tts_service !== "Amazon"}
        />
      </div>

      {settings.tts_service === "ElevenLabs" && (
        <div className="space-y-4">
          <Tabs defaultValue="select" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="select">Select Voice</TabsTrigger>
              <TabsTrigger value="custom">Custom Voice ID</TabsTrigger>
            </TabsList>
            <TabsContent value="select">
              <div className="space-y-2">
                <Label>ElevenLabs Voice</Label>
                <Select
                  value={settings.elevenlabs_voice_id}
                  onValueChange={(value) =>
                    setSettings((prev) => ({ 
                      ...prev, 
                      elevenlabs_voice_id: value,
                      custom_voice_id: "" // Clear custom voice ID when selecting from list
                    }))
                  }
                  disabled={isLoadingVoices || !settings.api_key}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingVoices ? "Loading voices..." : "Select a voice"} />
                  </SelectTrigger>
                  <SelectContent>
                    {elevenLabsVoices.map((voice) => (
                      <SelectItem key={voice.voice_id} value={voice.voice_id}>
                        {voice.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
            <TabsContent value="custom">
              <div className="space-y-2">
                <Label>Custom Voice ID</Label>
                <Input
                  type="text"
                  placeholder="Enter custom voice ID"
                  value={settings.custom_voice_id}
                  onChange={(e) =>
                    setSettings((prev) => ({ 
                      ...prev, 
                      custom_voice_id: e.target.value,
                      elevenlabs_voice_id: "" // Clear selected voice when entering custom ID
                    }))
                  }
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Stability ({settings.elevenlabs_stability})</Label>
              <Input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.elevenlabs_stability}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    elevenlabs_stability: parseFloat(e.target.value)
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Similarity Boost ({settings.elevenlabs_similarity_boost})</Label>
              <Input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.elevenlabs_similarity_boost}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    elevenlabs_similarity_boost: parseFloat(e.target.value)
                  }))
                }
              />
            </div>
          </div>
        </div>
      )}

      {settings.tts_service === "Amazon" && (
        <div className="space-y-2">
          <Label>AWS Polly Voice</Label>
          <Select
            value={settings.aws_polly_voice}
            onValueChange={(value) =>
              setSettings((prev) => ({ ...prev, aws_polly_voice: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a voice" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {Object.entries(voices).map(([language, languageVoices]) => (
                <div key={language}>
                  <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                    {language}
                  </div>
                  {languageVoices.map((voice: any) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      {voice.name} ({voice.gender})
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isSaving}>
        {isSaving ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </div>
        ) : (
          "Save Settings"
        )}
      </Button>
    </form>
  );
}