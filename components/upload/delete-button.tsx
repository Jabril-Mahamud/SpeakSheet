"use client";

import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DeleteButtonProps {
  filePath: string;
  fileId: string;
  onComplete: () => void;
  onError: (error: string) => void;
  disabled?: boolean;
  iconOnly?: boolean;
}

export default function DeleteButton({
  filePath,
  fileId,
  onComplete,
  onError,
  disabled,
  iconOnly = false
}: DeleteButtonProps) {
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const supabase = createClient();

      // First try to delete from storage
      const { error: storageError } = await supabase.storage
        .from('files')
        .remove([filePath]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
        // Don't throw here, continue with DB deletion
      }

      // Then delete from database
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId)
        .single();

      if (dbError) {
        console.error('Database deletion error:', dbError);
        throw new Error(dbError.message);
      }

      setOpen(false);
      onComplete();
    } catch (error) {
      console.error("Delete operation failed:", error);
      onError(error instanceof Error ? error.message : "Failed to delete file");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          onClick={(e) => {
            e.stopPropagation();
          }}
          disabled={disabled || deleting}
          variant={iconOnly ? "ghost" : "destructive"}
          size={iconOnly ? "icon" : "sm"}
          className={!iconOnly ? "ml-2" : ""}
          type="button"
        >
          {deleting ? (
            <Loader2 
              size={16} 
              className={`${iconOnly ? "" : "mr-2"} animate-spin`}
            />
          ) : (
            <Trash2 
              size={16} 
              className={iconOnly ? "" : "mr-2"}
            />
          )}
          {!iconOnly && (deleting ? "Deleting..." : "Delete")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete File</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this file? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}