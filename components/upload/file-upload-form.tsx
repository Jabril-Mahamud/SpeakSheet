'use client'

import { createClient } from "@/utils/supabase/client";
import { useState } from "react";
import { InfoIcon, Upload } from "lucide-react";
import { useRouter } from "next/navigation";

export default function FileUploadForm() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    // Validate file types
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileType = file.type;
      if (!fileType.includes('pdf') && !fileType.includes('audio')) {
        setError('Only PDF and audio files are allowed');
        return;
      }
    }

    setFiles(selectedFiles);
    setError(null);
  };

  const handleUpload = async () => {
    if (!files || files.length === 0) {
      setError('Please select files to upload');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const uploadPromises = Array.from(files).map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const folderPath = file.type.includes('pdf') ? 'pdfs' : 'audio';
        const filePath = `${user.id}/${folderPath}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase
          .from('user_files')
          .insert({
            user_id: user.id,
            file_path: filePath,
            file_type: file.type,
            original_name: file.name,
          });

        if (dbError) throw dbError;
      });

      await Promise.all(uploadPromises);
      router.refresh();
      setFiles(null);
      if (e.target.form) e.target.form.reset();
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-xl">
      <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center mb-6">
        <InfoIcon size="16" strokeWidth={2} />
        Upload PDF documents and audio files here
      </div>

      <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleUpload(); }}>
        <div className="border-2 border-dashed border-accent rounded-lg p-6">
          <input
            type="file"
            onChange={handleFileChange}
            multiple
            accept=".pdf,audio/*"
            className="w-full"
          />
          <p className="text-sm text-muted-foreground mt-2">
            Accepted files: PDF documents and audio files
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-md">
            {error}
          </div>
        )}

        {files && files.length > 0 && (
          <div className="bg-accent/50 p-3 rounded-md">
            <h3 className="font-medium mb-2">Selected files:</h3>
            <ul className="list-disc pl-5">
              {Array.from(files).map((file, i) => (
                <li key={i} className="text-sm">
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="submit"
          disabled={!files || uploading}
          className="w-full bg-foreground text-background py-2 px-4 rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Upload size={16} />
          {uploading ? 'Uploading...' : 'Upload Files'}
        </button>
      </form>
    </div>
  );
}