interface FileItem {
  id: string;
  user_id: string;
  file_path: string;
  file_type: string;
  original_name: string;
  created_at: string;
  character_count?: number;
  conversion_status?: string;
  audio_file_path?: string;
  voice_id?: string;
  conversion_error?: string;
  displayName?: string;
  extension?: string;
}

type SortOption = {
  field: string;
  direction: "asc" | "desc";
};

type DateFilterOption = "all" | "today" | "week" | "month";
type ViewMode = "list" | "grid";
