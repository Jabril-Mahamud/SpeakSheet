"use client";
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

const DEFAULT_SERVICE = "Amazon";
const DEFAULT_VOICE = process.env.NEXT_PUBLIC_AWS_POLLY_VOICE || "Joanna";

interface PollyVoice {
  id: string;
  name: string;
  gender: string;
  languageName: string;
}

export default function TtsSettingsForm() {
  const [settings, setSettings] = useState({
    tts_service: DEFAULT_SERVICE,
    api_key: "",
    aws_polly_voice: DEFAULT_VOICE,
  });
  const [voices, setVoices] = useState<Record<string, PollyVoice[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (settings.tts_service === "Amazon") {
      fetchVoices();
    }
  }, [settings.tts_service]);

  async function fetchSettings() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_tts_settings")
        .select()
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setSettings(data);
      } else {
        // Create default settings
        const { error: insertError } = await supabase
          .from("user_tts_settings")
          .insert({
            id: user.id,
            tts_service: DEFAULT_SERVICE,
            aws_polly_voice: DEFAULT_VOICE,
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

  async function fetchVoices() {
    try {
      const response = await fetch("/api/voices");
      if (!response.ok) throw new Error();
      const data = await response.json();
      setVoices(data);
    } catch {
      toast({
        variant: "destructive",
        title: "Error loading voices",
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSaving) return;

    // Validate API key for non-Amazon services
    if (settings.tts_service !== "Amazon" && !settings.api_key) {
      toast({
        variant: "destructive",
        title: `API key required for ${settings.tts_service}`,
      });
      return;
    }

    setIsSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error();

      const { error } = await supabase.from("user_tts_settings").upsert({
        id: user.id,
        ...settings,
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
            <SelectItem value="Google">Google</SelectItem>
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
          type="text"
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
                  {languageVoices.map((voice) => (
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
