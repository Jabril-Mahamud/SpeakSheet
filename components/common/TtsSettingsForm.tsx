'use client'
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/utils/supabase/client";
import { Loader2 } from "lucide-react";
import { TtsSettings } from "@/utils/types";

const DEBOUNCE_TIME = 1000;

export default function TtsSettingsForm() {
  const [ttsSettings, setTtsSettings] = useState<TtsSettings | null>(null);
  const [formData, setFormData] = useState({
    tts_service: '',
    api_key: '',
    aws_polly_voice: ''
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    const timer = setTimeout(fetchSettings, DEBOUNCE_TIME);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ttsSettings) {
      setFormData({
        tts_service: ttsSettings.tts_service || '',
        api_key: ttsSettings.api_key || '',
        aws_polly_voice: ttsSettings.aws_polly_voice || ''
      });
    }
  }, [ttsSettings]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || isProcessing) return;
    
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, DEBOUNCE_TIME));
    setIsSaving(true);
    setIsProcessing(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('user_tts_settings')
        .upsert({
          id: user.id,
          ...formData,
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

  if (loading) {
    return (
      <Card>
        <CardContent className="min-h-[400px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading settings...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="tts_service">TTS Service</Label>
        <Select 
          value={formData.tts_service}
          onValueChange={(value) => setFormData(prev => ({ ...prev, tts_service: value }))}
          disabled={isProcessing}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a service (Not implemented yet!)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ElevenLabs">ElevenLabs</SelectItem>
            <SelectItem value="Google">Google</SelectItem>
            <SelectItem value="Amazon">Amazon</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="api_key">Custom API Key (Optional)</Label>
        <Input
          type="text"
          id="api_key"
          value={formData.api_key}
          onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
          disabled={isProcessing}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="aws_polly_voice">AWS Polly Voice</Label>
        <Input
          type="text"
          id="aws_polly_voice"
          value={formData.aws_polly_voice}
          onChange={(e) => setFormData(prev => ({ ...prev, aws_polly_voice: e.target.value }))}
          placeholder="e.g. Joanna, Matthew"
          disabled={isProcessing}
        />
      </div>

      <Button 
        type="submit" 
        className="w-full" 
        disabled={isSaving || isProcessing}
      >
        {isProcessing ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </div>
        ) : isSaving ? (
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