// app/protected/library/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Download, Trash2, RefreshCw } from 'lucide-react';
import { formatDate } from '@/utils/dateFormat';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

type AudioFile = {
  id: string;
  original_name: string;
  created_at: string;
  audio_file_path: string;
  voice_id: string;
  character_count: number;
  conversion_status: 'processing' | 'completed' | 'error';
};

export default function LibraryPage() {
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'processing'>('all');
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  
  useEffect(() => {
    fetchFiles();
  }, []);
  
  async function fetchFiles() {
    try {
      setIsLoading(true);
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setFiles(data || []);
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setIsLoading(false);
    }
  }
  
  async function deleteFile(id: string) {
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setFiles(files.filter(file => file.id !== id));
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }
  
  // Filter files based on active tab
  const filteredFiles = files.filter(file => {
    if (activeTab === 'all') return true;
    if (activeTab === 'completed') return file.conversion_status === 'completed';
    if (activeTab === 'processing') return file.conversion_status === 'processing';
    return true;
  });
  
  if (isLoading) {
    return (
      <div className="container max-w-5xl mx-auto py-12 flex justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Your Audio Library</h1>
        <Button asChild>
          <Link href="/protected/convert">Convert New PDF</Link>
        </Button>
      </div>
      
      <Tabs 
        defaultValue="all" 
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as any)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Files</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-6">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-12 border rounded-lg">
              <p className="text-muted-foreground">No files found</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredFiles.map(file => (
                <Card key={file.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h3 className="font-medium truncate">{file.original_name}</h3>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(file.created_at)} • {Math.round(file.character_count / 1000)}k characters
                        </div>
                        <div className="mt-1">
                          {file.conversion_status === 'completed' ? (
                            <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded-full">
                              Completed
                            </span>
                          ) : file.conversion_status === 'processing' ? (
                            <span className="text-xs bg-blue-500/10 text-blue-600 px-2 py-1 rounded-full">
                              Processing
                            </span>
                          ) : (
                            <span className="text-xs bg-red-500/10 text-red-600 px-2 py-1 rounded-full">
                              Error
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {file.conversion_status === 'completed' && file.audio_file_path && (
                        <div className="flex gap-2 md:gap-4">
                          <audio 
                            id={`audio-${file.id}`}
                            src={file.audio_file_path} 
                            onPlay={() => setCurrentlyPlaying(file.id)}
                            onPause={() => setCurrentlyPlaying(null)}
                            className="hidden"
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const audio = document.getElementById(`audio-${file.id}`) as HTMLAudioElement;
                              if (currentlyPlaying === file.id) {
                                audio.pause();
                              } else {
                                audio.play();
                              }
                            }}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            {currentlyPlaying === file.id ? 'Pause' : 'Play'}
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <a href={file.audio_file_path} download>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </a>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => deleteFile(file.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}