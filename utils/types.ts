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
export interface TtsSettings {
  id: string;
  tts_service: string;
  api_key?: string;
  aws_polly_voice?: string;
  created_at: string;
  updated_at: string;
}

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
  showButtons: boolean; 
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

export interface FileDialogProps {
  title?: string;
  file?: {
    id: string;
    file_path: string;
    file_type: string;
    original_name: string;
    created_at: string; 
  } | null;
  mode?: 'upload' | 'view';
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  content?: string;
}

export interface ConvertButtonProps {
  text: string;
  fileName: string;
  voiceId?: string;
  onProgress: (progress: number) => void;
  onComplete: () => void;
  onError: (error: string) => void;
  disabled?: boolean;
  iconOnly?: boolean;
}

export interface TTSSettings {
  default_service: string;
  aws_polly_voice?: string;
  elevenlabs_voice_id?: string;
  elevenlabs_stability?: number;
  elevenlabs_similarity_boost?: number;
  api_key?: string;
}

export interface ConvertButtonProps {
  text: string;
  fileName: string;
  onProgress: (progress: number) => void;
  onComplete: () => void;
  onError: (error: string) => void;
  disabled?: boolean;
  iconOnly?: boolean;
}


export interface UserProfile {
  username: string | null;
  full_name: string | null;
}

export interface UserWithProfile {
  id: string;
  email: string | null;
  profiles: UserProfile | null;
}
export interface UserUsageStats {
  userId: string;
  email: string | null;
  username: string;
  daily: UsagePeriodStats;
  monthly: UsagePeriodStats;
  yearly: UsagePeriodStats;
}

export interface UsagePeriodStats {
  totalCharacters: number;
  limit: number;
  voiceDistribution: Record<string, number>;
  quotaRemaining: number;
  resetTime: number;
  lastUsedAt?: string; // Optional timestamp of last usage
}

export interface PollyUsageRecord {
  id?: number;
  user_id: string;
  characters_synthesized: number;
  voice_id: string;
  synthesis_date: string;
  content_hash?: string;
}

export interface DatabaseUser {
  id: string;
  email: string | null;
  profiles:
    | {
        username: string | null;
        full_name: string | null;
      }[]
    | null; // Change to array since Supabase returns it as array
}