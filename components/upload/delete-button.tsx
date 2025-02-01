// components/upload/delete-button.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { useState } from "react";

interface DeleteButtonProps {
  filePath: string;
  fileId: string;
  onComplete: () => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

export default function DeleteButton({
  filePath,
  fileId,
  onComplete,
  onError,
  disabled
}: DeleteButtonProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      setDeleting(true);

      const response = await fetch("/api/delete-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filePath,
          fileId
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      onComplete();
    } catch (error) {
      console.error("Deletion error:", error);
      onError(error instanceof Error ? error.message : "Failed to delete file");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Button
      onClick={handleDelete}
      disabled={disabled || deleting}
      variant="destructive"
      size="sm"
      className="ml-2"
      type="button"
    >
      {deleting ? (
        <Loader2 size={16} className="animate-spin mr-2" />
      ) : (
        <Trash2 size={16} className="mr-2" />
      )}
      {deleting ? "Deleting..." : "Delete"}
    </Button>
  );
}