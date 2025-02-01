'use client';

import { useState, useEffect } from "react";
import { InfoIcon } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { TtsSettings } from "@/utils/types";

export default function TtsSettingsForm() {
  const [ttsSettings, setTtsSettings] = useState<TtsSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch("/api/tts-settings");
        if (!response.ok) {
          throw new Error('Failed to fetch settings');
        }
        const data = await response.json();
        setTtsSettings(data);
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load TTS settings",
        });
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const tts_service = formData.get("tts_service");
    const api_key = formData.get("api_key");

    try {
      const response = await fetch("/api/tts-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tts_service, api_key }),
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      const data = await response.json();
      toast({
        title: "Success",
        description: "Settings updated successfully",
      });

      if (ttsSettings?.id) {
        setTtsSettings({
          id: ttsSettings.id,
          tts_service: tts_service as string,
          api_key: api_key as string,
        });
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update settings",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          Loading...
        </CardContent>
      </Card>
    );
  }

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
            <Label htmlFor="api_key">API Key</Label>
            <Input
              type="text"
              id="api_key"
              name="api_key"
              defaultValue={ttsSettings?.api_key || ""}
              required
            />
          </div>

          <Button type="submit" className="w-full">
            Save Settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}