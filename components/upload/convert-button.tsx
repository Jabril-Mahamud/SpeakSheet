"use client";

import { Button } from "@/components/ui/button";
import { Headphones, Loader2 } from "lucide-react";
import { useState } from "react";

interface ConvertButtonProps {
  text: string;
  fileName: string;
  onProgress: (progress: number) => void;
  onComplete: () => void;
  onError: (error: string) => void;
  disabled?: boolean;
  iconOnly?: boolean;
}

export function ConvertButton({
  text,
  fileName,
  onProgress,
  onComplete,
  onError,
  disabled,
  iconOnly = false,
}: ConvertButtonProps) {
  const [converting, setConverting] = useState(false);

  const handleConvert = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      setConverting(true);
      onProgress(33);

      const response = await fetch("/api/convert-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceId: "Matthew" }),
      });

      if (!response.ok) throw new Error(await response.text());

      onProgress(66);
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      onProgress(100);
      onComplete();
    } catch (error) {
      console.error("Conversion error:", error);
      onError(error instanceof Error ? error.message : "Failed to convert to audio");
    } finally {
      setConverting(false);
    }
  };

  return (
    <Button
      onClick={handleConvert}
      disabled={disabled || converting}
      variant={iconOnly ? "ghost" : "secondary"}
      size={iconOnly ? "icon" : "sm"}
      className={!iconOnly ? "ml-2" : ""}
      type="button"
      title={iconOnly ? "Convert to Audio" : undefined}
    >
      {converting ? (
        <Loader2 
          size={16} 
          className={`${iconOnly ? "" : "mr-2"} animate-spin`}
        />
      ) : (
        <Headphones 
          size={16} 
          className={iconOnly ? "" : "mr-2"}
        />
      )}
      {!iconOnly && (converting ? "Converting..." : "Convert to Audio")}
    </Button>
  );
}