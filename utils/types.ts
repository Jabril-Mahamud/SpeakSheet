export type FileUploadProps = {
  children: React.ReactNode;
};
export type UploadFormProps = {
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
export interface FileRecord {
  id: string;
  file_path: string;
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: "uploading" | "converting" | "processing" | "complete" | "error";
  fileRecord?: FileRecord;
}

export interface FileProgressItemProps {
  file: File;
  progress?: UploadProgress;
  showButtons: boolean;  // Changed to explicitly require boolean
  isText: boolean;
  convertedText?: string;
  onUpdateProgress: (fileName: string, progress: number) => void;
  onConvertComplete: () => void;
  onConvertError: (error: string) => void;
  getStatusText: (status: UploadProgress["status"]) => string;
}
export interface FileProgressListProps {
  files: FileList;
  uploadProgress: Record<string, UploadProgress>;
  convertedFiles: Record<string, string>;
  onUpdateProgress: (fileName: string, progress: number) => void;
  onConvertComplete: () => void;
  onConvertError: (error: string) => void;
}
