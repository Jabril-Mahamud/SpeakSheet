'use client'

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Download, Loader2 } from "lucide-react";
import { FileUploadForm } from "./FileUploadForm";
import { createClient } from "@/utils/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { useRouter } from "next/navigation";
import { useFileManager } from "@/hooks/useFileManager";
import { ConvertButton } from "../upload/convert-button";
import DeleteButton from "../upload/delete-button";
import { FileDialogProps } from "@/utils/types";

export function FileDialog({
  title = "Upload Files",
  file = null,
  mode = 'upload',
  open = false,
  onOpenChange,
  content = '',
}: FileDialogProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const supabase = createClient();
  const router = useRouter();
  const { loading, handleDownload } = useFileManager();

  useEffect(() => {
    if (file && file.file_type.includes('audio') && open) {
      const loadAudio = async () => {
        try {
          const { data, error } = await supabase.storage
            .from('files')
            .download(file.file_path);

          if (error) throw error;

          const url = URL.createObjectURL(data);
          setAudioUrl(url);
        } catch (error) {
          console.error('Error loading audio:', error);
        }
      };

      loadAudio();
    }

    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
    };
  }, [file, open]);

  useEffect(() => {
    if (!open) {
      setIsPlaying(false);
      setCurrentTime(0);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [open]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSliderChange = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const resetAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(false);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] w-[90vw]">
        <DialogHeader className="px-6 py-4 flex flex-row items-center justify-between">
          <DialogTitle className="text-xl">
            {mode === 'view' && file ? file.original_name : title}
          </DialogTitle>
          <div className="flex items-center gap-2">
            {file?.file_type === "text/plain" && (
              <ConvertButton
                text={content}
                fileName={file.original_name}
                onProgress={() => {
                  // Handle progress if needed
                }}
                onComplete={() => {
                  router.refresh();
                  onOpenChange?.(false);
                }}
                onError={(error) => {
                  console.error('Conversion error:', error);
                }}
              />
            )}
            {file && (
              <>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(file);
                  }}
                  disabled={loading === file.id}
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                >
                  {loading === file.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Download
                </Button>
                <DeleteButton
                  filePath={file.file_path}
                  fileId={file.id}
                  onComplete={() => {
                    router.refresh();
                    onOpenChange?.(false);
                  }}
                  onError={(error) => {
                    console.error('Delete error:', error);
                  }}
                />
              </>
            )}
          </div>
        </DialogHeader>
       
        <div className="p-6">
          {mode === 'upload' ? (
            <FileUploadForm onSuccess={() => onOpenChange?.(false)} />
          ) : file?.file_type.includes('audio') ? (
            <div className="space-y-6">
              <audio
                ref={audioRef}
                src={audioUrl || undefined}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
              />
              
              <div className="flex items-center justify-center gap-6">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12"
                  onClick={resetAudio}
                  disabled={!audioUrl}
                >
                  <RotateCcw className="h-6 w-6" />
                </Button>
                <Button
                  onClick={togglePlayPause}
                  disabled={!audioUrl}
                  variant="outline"
                  size="icon"
                  className="h-12 w-12"
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6" />
                  )}
                </Button>
              </div>

              <div className="space-y-2">
                <Slider
                  value={[currentTime]}
                  max={duration}
                  step={0.1}
                  onValueChange={handleSliderChange}
                  disabled={!audioUrl}
                  className="cursor-pointer"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>
          ) : file?.file_type === "text/plain" ? (
            <ScrollArea className="h-[60vh] w-full rounded-md border">
              <div className="whitespace-pre-wrap font-mono text-sm p-4">
                {content}
              </div>
            </ScrollArea>
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              This file type cannot be previewed
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}