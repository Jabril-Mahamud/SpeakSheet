// app/protected/convert/page.tsx
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FileUploader from '@/components/file/FileUploader';
import VoiceSelector from '@/components/voice/VoiceSelector';
import SubscriptionBanner from '@/components/Subscription/SubscriptionBanner';
import { useToast } from '@/hooks/use-toast';
import { Play, Download, RefreshCw } from 'lucide-react';

type VoiceOption = {
  id: string;
  name: string;
  provider: 'Amazon' | 'ElevenLabs' | 'Neuphonic';
};

export default function ConvertPage() {
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileUploaded = (fileId: string) => {
    setUploadedFileId(fileId);
    setAudioUrl(null); // Reset audio when new file is uploaded
  };

  const handleConvert = async () => {
    if (!uploadedFileId || !selectedVoice) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please upload a file and select a voice before converting."
      });
      return;
    }

    try {
      setIsConverting(true);
      
      const response = await fetch('/api/files/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileId: uploadedFileId,
          provider: selectedVoice.provider,
          voiceId: selectedVoice.id,
          options: {} // Add any additional options here
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Conversion failed');
      }

      const { audioUrl } = await response.json();
      setAudioUrl(audioUrl);
      
      toast({
        title: "Conversion complete",
        description: "Your PDF has been successfully converted to audio."
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Conversion failed",
        description: error instanceof Error ? error.message : 'An error occurred during conversion'
      });
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Convert PDF to Audio</h1>
      
      <SubscriptionBanner />
      
      <div className="grid gap-8">
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload PDF</TabsTrigger>
            <TabsTrigger value="voice">Select Voice</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="mt-4">
            <FileUploader onFileUploaded={handleFileUploaded} />
            {uploadedFileId && (
              <div className="mt-4 p-3 bg-primary/5 rounded-md text-sm flex items-center">
                <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                File uploaded successfully
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="voice" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <VoiceSelector onVoiceSelect={setSelectedVoice} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-center">
          <Button 
            size="lg" 
            onClick={handleConvert}
            disabled={!uploadedFileId || !selectedVoice || isConverting}
          >
            {isConverting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                Convert to Audio
              </>
            )}
          </Button>
        </div>
        
        {audioUrl && (
          <div className="mt-6 p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Your Audio is Ready!</h2>
            <audio controls className="w-full mb-4">
              <source src={audioUrl} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
            <div className="flex space-x-4">
              <Button variant="outline" className="w-full" asChild>
                <a href={audioUrl} download>
                  <Download className="mr-2 h-4 w-4" />
                  Download Audio
                </a>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}