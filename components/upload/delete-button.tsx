"use client";

import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client"; 

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
      const supabase = createClient();
      
      // Remove from storage
      const { error: storageError } = await supabase.storage
        .from('files') // Replace with your bucket name
        .remove([filePath]);
      
      if (storageError) {
        throw new Error(storageError.message);
      }

      // Delete the database record if needed
      const { error: dbError } = await supabase
        .from('files') // Replace with your table name
        .delete()
        .match({ id: fileId });

      if (dbError) {
        throw new Error(dbError.message);
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