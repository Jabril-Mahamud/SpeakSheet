import { LucideIcon } from "lucide-react";

// File and Upload related types
export interface FileRecord {
  id: string;
  file_path: string;
  file_type?: string;
  original_name?: string;
  created_at?: string;
}

export interface FileData extends FileRecord {
  file_type: string;
  original_name: string;
  created_at: string;
}

export type FileUploadProps = {
  children: React.ReactNode;
  onSuccess?: () => void;
};

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: "uploading" | "converting" | "processing" | "complete" | "error";
  fileRecord?: FileRecord;
}

// File Progress related types
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

// Dialog and UI Component types
export interface FileDialogProps {
  title?: string;
  file?: FileData | null;
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

// User and Profile types
export interface UserProfile {
  username: string | null;
  full_name: string | null;
}

export interface UserWithProfile {
  id: string;
  email: string | null;
  profiles: UserProfile | null;
}

// TTS and Settings types
export interface TTSSettings {
  id: string;
  tts_service: string;
  api_key?: string | null;
  aws_polly_voice?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TTSSettingsUpdatePayload {
  tts_service: string;
  api_key?: string | null;
  aws_polly_voice?: string | null;
}


// Usage and Statistics types
export interface UsagePeriodStats {
  totalCharacters: number;
  limit: number;
  voiceDistribution: Record<string, number>;
  quotaRemaining: number;
  resetTime: number;
  lastUsedAt?: string;
}

export interface UserUsageStats {
  userId: string;
  email: string | null;
  username: string;
  daily: UsagePeriodStats;
  monthly: UsagePeriodStats;
  yearly: UsagePeriodStats;
}

export interface PollyUsageRecord {
  id?: number;
  user_id: string;
  characters_synthesized: number;
  voice_id: string;
  synthesis_date: string;
  content_hash?: string;
}

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtext: string;
}

export interface FileUploadFormProps {
  onSuccess?: () => void;
}
export interface AdminSettings {
  default_voice_id: string;
  rate_limit_daily: number;
  rate_limit_monthly: number;
  max_file_size_mb: number;
  require_email_verification: boolean;
  allow_public_sharing: boolean;
  maintenance_mode: boolean;
}

export interface PollyDashboardProps {
  usageStats: UserUsageStats[];
  onRefresh?: () => Promise<void>;
}

export interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}
export interface Voice {
  voice_id: string;
  name: string;
  preview_url?: string;
  category?: string;
}

export interface UsageStats {
  totalUsers: number;
  dailyTotal: number;
  trends: Array<{
    date: string;
    characters: number;
  }>;
  users: Array<{
    id: string;
    username: string;
    email: string;
    isActive: boolean;
    charactersUsed: number;
    lastActive: string;
  }>;
}

export interface FileStats {
  totalFiles: number;
  successRate: number;
  files: Array<{
    id: string;
    name: string;
    user: string;
    status: 'completed' | 'processing' | 'failed';
    createdAt: string;
    size: string;
  }>;
}