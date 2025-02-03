"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUploadForm } from "../files/FileUploadForm";

export default function UploadModal({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const handleSuccess = () => {
    router.refresh();
    setOpen(false);
  }

  return (
    <Dialog 
      open={open} 
      onOpenChange={setOpen}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
        </DialogHeader>
        
        <FileUploadForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}