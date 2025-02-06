'use client'
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/utils/supabase/client";

interface TtsSettings {
  id: string;
  tts_service: string;
  api_key?: string;
  aws_polly_voice?: string;
  created_at: string;
  updated_at: string;
}

export default function TtsSettingsForm() {
  const [ttsSettings, setTtsSettings] = useState<TtsSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user found');
  
        const { data, error } = await supabase
          .from('user_tts_settings')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
  
        if (!data) {
          const { data: newData, error: insertError } = await supabase
            .from('user_tts_settings')
            .insert({
              id: user.id,
              tts_service: 'Amazon',
              aws_polly_voice: process.env.NEXT_PUBLIC_AWS_POLLY_VOICE || 'Joanna',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
  
          if (insertError) throw insertError;
          setTtsSettings(newData);
        } else {
          setTtsSettings(data);
        }
      } catch (error) {
        console.error('Error:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load TTS settings"
        });
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, [supabase, toast]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSaving) return;
    
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('user_tts_settings')
        .upsert({
          id: user.id,
          tts_service: formData.get("tts_service") as string,
          api_key: formData.get("api_key") as string || null,
          aws_polly_voice: formData.get("aws_polly_voice") as string,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setTtsSettings(data);
      toast({
        title: "Success",
        description: "Settings updated successfully",
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update settings",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <Card><CardContent className="pt-6">Loading...</CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>TTS Service Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="tts_service">TTS Service</Label>
            <Select name="tts_service" defaultValue={ttsSettings?.tts_service || ""}>
              <SelectTrigger>
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ElevenLabs">ElevenLabs</SelectItem>
                <SelectItem value="Google">Google</SelectItem>
                <SelectItem value="Amazon">Amazon</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="api_key">API Key (Optional)</Label>
            <Input
              type="text"
              id="api_key"
              name="api_key"
              defaultValue={ttsSettings?.api_key || ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="aws_polly_voice">AWS Polly Voice</Label>
            <Input
              type="text"
              id="aws_polly_voice"
              name="aws_polly_voice"
              defaultValue={ttsSettings?.aws_polly_voice || ""}
              placeholder="e.g. Joanna, Matthew"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}