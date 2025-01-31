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
