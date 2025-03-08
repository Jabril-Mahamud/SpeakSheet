"use client";
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/utils/supabase/client";
import { Loader2, Lock, Star, Mic2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Voice {
  voice_id: string;
  name: string;
  preview_url?: string;
  category?: string;
  id?: string;
  gender?: string;
  isFree?: boolean;
  isNeural?: boolean;
}

export default function TtsSettingsForm() {
  const [settings, setSettings] = useState({
    tts_service: "Amazon",
    api_key: "",
    aws_polly_voice: "",
    elevenlabs_voice_id: "",
    elevenlabs_stability: 0.5,
    elevenlabs_similarity_boost: 0.75,
    custom_voice_id: "",
    neuphonic_voice_id: "",
    neuphonic_lang_code: "en",
    neuphonic_model: "neu_hq",
  });

  const [voices, setVoices] = useState<Record<string, Voice[]>>({});
  const [elevenLabsVoices, setElevenLabsVoices] = useState<Voice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [hasCustomCredentials, setHasCustomCredentials] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  const neuphonicLanguages = [
    { code: "en", name: "English" },
    { code: "de", name: "German" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "it", name: "Italian" },
    { code: "pt", name: "Portuguese" },
    { code: "pl", name: "Polish" },
    { code: "nl", name: "Dutch" },
    { code: "tr", name: "Turkish" },
    { code: "ru", name: "Russian" }
  ];

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
      const response = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: {
          Accept: "application/json",
          "xi-api-key": settings.api_key,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch voices");

      const data = await response.json();
      setElevenLabsVoices(data.voices);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error loading ElevenLabs voices",
        description: "Please check your API key and try again",
      });
    } finally {
      setIsLoadingVoices(false);
    }
  }

  async function fetchPollyVoices() {
    setIsLoadingVoices(true);
    try {
      const response = await fetch("/api/voices/polly");
      if (!response.ok) throw new Error();
      const {
        voices,
        hasCustomCredentials: hasCreds,
        defaultVoice,
      } = await response.json();
      setVoices(voices);
      setHasCustomCredentials(hasCreds);

      if (!settings.aws_polly_voice) {
        setSettings((prev) => ({ ...prev, aws_polly_voice: defaultVoice }));
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error loading Polly voices",
      });
    } finally {
      setIsLoadingVoices(false);
    }
  }

  async function fetchSettings() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_tts_settings")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setSettings(prev => ({...prev, ...data}));
        if (data.tts_service === "ElevenLabs" && data.api_key) {
          fetchElevenLabsVoices();
        }
      } else {
        const { error: insertError } = await supabase
          .from("user_tts_settings")
          .insert({
            id: user.id,
            tts_service: "Amazon",
            aws_polly_voice:
              process.env.NEXT_PUBLIC_AWS_POLLY_VOICE || "Joanna",
            neuphonic_lang_code: "en",
            neuphonic_model: "neu_hq",
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error();

      const voiceIdToSave = 
        settings.tts_service === "ElevenLabs"
          ? settings.custom_voice_id || settings.elevenlabs_voice_id
          : settings.tts_service === "Neuphonic"
          ? settings.neuphonic_voice_id
          : settings.aws_polly_voice;

      const { error } = await supabase.from("user_tts_settings").upsert({
        id: user.id,
        ...settings,
        [settings.tts_service === "ElevenLabs"
          ? "elevenlabs_voice_id"
          : settings.tts_service === "Neuphonic"
          ? "neuphonic_voice_id" 
          : "aws_polly_voice"]: voiceIdToSave,
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
            <SelectItem value="Neuphonic">Neuphonic</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {settings.tts_service === "Amazon" && !hasCustomCredentials && (
        <Alert>
          <AlertDescription>
            Using default AWS credentials. Only free voices are available. Add
            your own AWS credentials to access all voices.
          </AlertDescription>
        </Alert>
      )}

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
              ? "Leave empty to use free voices only"
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
              <SelectValue
                placeholder={
                  isLoadingVoices ? "Loading voices..." : "Select a voice"
                }
              />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {Object.entries(voices).map(([language, languageVoices]) => (
                <SelectGroup key={language}>
                  <SelectLabel className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                    {language}
                  </SelectLabel>
                  {languageVoices.map((voice) => (
                    <SelectItem
                      key={voice.id || voice.voice_id}
                      value={voice.id || voice.voice_id}
                      disabled={!hasCustomCredentials && !voice.isFree}
                      className="relative"
                    >
                      <div className="flex items-center gap-2">
                        <span>
                          {voice.name} {voice.gender && `(${voice.gender})`}
                        </span>
                        {voice.isNeural && (
                          <span title="Neural Engine">
                            <Mic2 className="h-4 w-4 text-blue-500" />
                          </span>
                        )}
                        {voice.isFree && (
                          <span title="Free Voice">
                          <Star
                            className="h-4 w-4 text-yellow-500"
                          />
                          </span>
                        )}
                        {!voice.isFree && (
                          
                          <span title="Premium Voice">
                            <Lock
                            className="h-4 w-4 text-gray-500"
                            
                          />
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

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
                      custom_voice_id: "",
                    }))
                  }
                  disabled={isLoadingVoices || !settings.api_key}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        isLoadingVoices ? "Loading voices..." : "Select a voice"
                      }
                    />
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
                      elevenlabs_voice_id: "",
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
                    elevenlabs_stability: parseFloat(e.target.value),
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>
                Similarity Boost ({settings.elevenlabs_similarity_boost})
              </Label>
              <Input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.elevenlabs_similarity_boost}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    elevenlabs_similarity_boost: parseFloat(e.target.value),
                  }))
                }
              />
            </div>
          </div>
        </div>
      )}

      {settings.tts_service === "Neuphonic" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Language</Label>
            <Select
              value={settings.neuphonic_lang_code}
              onValueChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  neuphonic_lang_code: value,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {neuphonicLanguages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Voice ID</Label>
            <Input
              type="text"
              placeholder="Enter voice ID (leave empty for default voice)"
              value={settings.neuphonic_voice_id}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  neuphonic_voice_id: e.target.value,
                }))
              }
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter the voice ID provided by Neuphonic. Leave empty to use the default voice.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label>Model</Label>
            <Select
              value={settings.neuphonic_model}
              onValueChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  neuphonic_model: value,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="neu_hq">neu_hq (High Quality)</SelectItem>
                <SelectItem value="neu_base">neu_base (Standard)</SelectItem>
              </SelectContent>
            </Select>
          </div>
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