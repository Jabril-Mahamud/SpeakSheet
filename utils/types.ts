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
