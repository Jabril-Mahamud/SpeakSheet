// components/upload/convert-button.tsx
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
}

export function ConvertButton({
  text,
  fileName,
  onProgress,
  onComplete,
  onError,
  disabled,
}: ConvertButtonProps) {
  const [converting, setConverting] = useState(false);

  const handleConvert = async (e: React.MouseEvent) => {
    e.preventDefault();
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
      variant="secondary"
      size="sm"
      className="ml-2"
      type="button"
    >
      {converting ? (
        <Loader2 size={16} className="animate-spin mr-2" />
      ) : (
        <Headphones size={16} className="mr-2" />
      )}
      {converting ? "Converting..." : "Convert to Audio"}
    </Button>
  );
}