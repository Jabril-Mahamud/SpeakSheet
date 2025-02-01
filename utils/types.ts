type FileUploadProps = {
  children: React.ReactNode;
};
type UploadFormProps = {
  onSubmit: (e: React.FormEvent) => Promise<void>;
  files: FileList | null;
  error: string | null;
  uploading: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};
export type TtsSettings = {
  id: string;
  tts_service: string;
  api_key: string;
};
interface FileRecord {
  id: string;
  file_path: string;
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: "uploading" | "converting" | "processing" | "complete" | "error";
  fileRecord?: FileRecord;
}