import { useFileUpload } from "@/hooks/useFileUpload";
import { InfoIcon, Upload } from "lucide-react";

export function FileUploadForm({ onSuccess }: { onSuccess?: () => void }) {
  const { files, uploading, error, handleFileChange, handleUpload } = useFileUpload();

  return (
    <div className="w-full max-w-xl">
      <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center mb-6">
        <InfoIcon size="16" strokeWidth={2} />
        Upload PDF documents and audio files here
      </div>

      <form className="space-y-6" onSubmit={(e) => handleUpload(e)}>
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
          className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Upload size={16} />
          {uploading ? "Uploading..." : "Upload Files"}
        </button>
      </form>
    </div>
  );
}