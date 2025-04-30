// components/file/FileConversionPanel.tsx
"use client";

import { useState } from 'react';
import FileUploader from './FileUploader';
import VoiceSelector from '../voice/VoiceSelector';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SubscriptionGuard from '@/components/Subscription/SubscriptionGuard';

export default function FileConversionPanel() {
  const [fileId, setFileId] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<any>(null);
  
  return (
    <SubscriptionGuard>
      <div className="space-y-6">
        <Tabs defaultValue="file">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="file">Upload File</TabsTrigger>
            <TabsTrigger value="voice">Select Voice</TabsTrigger>
          </TabsList>
          
          <TabsContent value="file" className="pt-4">
            <FileUploader onFileUploaded={setFileId} />
          </TabsContent>
          
          <TabsContent value="voice" className="pt-4">
            <VoiceSelector onVoiceSelect={setSelectedVoice} />
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-center">
          <Button 
            disabled={!fileId || !selectedVoice} 
            className="w-full sm:w-auto"
          >
            Convert to Audio
          </Button>
        </div>
      </div>
    </SubscriptionGuard>
  );
}