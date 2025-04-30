// components/voice/VoiceSelector.tsx
"use client";

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Voice = {
  id: string;
  name: string;
  provider: 'Amazon' | 'ElevenLabs' | 'Neuphonic';
  preview?: string;
};

// Example voice data - in a real app, fetch this from your API
const VOICE_OPTIONS: Voice[] = [
  // Amazon Polly Voices
  { id: 'Joanna', name: 'Joanna (Female)', provider: 'Amazon' },
  { id: 'Matthew', name: 'Matthew (Male)', provider: 'Amazon' },
  { id: 'Ruth', name: 'Ruth (Female)', provider: 'Amazon' },
  { id: 'Stephen', name: 'Stephen (Male)', provider: 'Amazon' },
  
  // ElevenLabs Voices
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (Male)', provider: 'ElevenLabs' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Nicole (Female)', provider: 'ElevenLabs' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (Female)', provider: 'ElevenLabs' },
  
  // Neuphonic Voices
  { id: 'maya', name: 'Maya (Female)', provider: 'Neuphonic' },
  { id: 'jackson', name: 'Jackson (Male)', provider: 'Neuphonic' },
];

type VoiceSelectorProps = {
  onVoiceSelect: (voice: Voice) => void;
};

export default function VoiceSelector({ onVoiceSelect }: VoiceSelectorProps) {
  const [selectedProvider, setSelectedProvider] = useState<'Amazon' | 'ElevenLabs' | 'Neuphonic'>('Amazon');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('Joanna');
  
  // Filter voices by provider
  const filteredVoices = VOICE_OPTIONS.filter(voice => voice.provider === selectedProvider);
  
  // Set default voice when provider changes
  useEffect(() => {
    if (filteredVoices.length > 0) {
      setSelectedVoiceId(filteredVoices[0].id);
      onVoiceSelect(filteredVoices[0]);
    }
  }, [selectedProvider]);
  
  // Update selected voice when ID changes
  useEffect(() => {
    const selectedVoice = VOICE_OPTIONS.find(voice => voice.id === selectedVoiceId);
    if (selectedVoice) {
      onVoiceSelect(selectedVoice);
    }
  }, [selectedVoiceId]);

  return (
    <div className="space-y-4">
      <Label>Voice Provider</Label>
      <Tabs defaultValue="Amazon" onValueChange={(value) => setSelectedProvider(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="Amazon">Amazon Polly</TabsTrigger>
          <TabsTrigger value="ElevenLabs">ElevenLabs</TabsTrigger>
          <TabsTrigger value="Neuphonic">Neuphonic</TabsTrigger>
        </TabsList>
      </Tabs>
      
      <div className="space-y-2">
        <Label>Select Voice</Label>
        <Select value={selectedVoiceId} onValueChange={setSelectedVoiceId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a voice" />
          </SelectTrigger>
          <SelectContent>
            {filteredVoices.map((voice) => (
              <SelectItem key={voice.id} value={voice.id}>
                {voice.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}