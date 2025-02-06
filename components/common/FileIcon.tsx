import { File, FileAudio, Headphones, Text } from "lucide-react";

export function FileIcon({ type, size = 24 }: { type: string; size?: number }) {
  return type.includes('pdf') ? (
    <Text size={size} className="text-foreground/80 shrink-0" />
  ) : (
    <FileAudio size={size} className="text-foreground/80 shrink-0" />
  );
}

export const getFileIcon = (fileType: string) => {
  if (fileType.includes('pdf') || fileType === 'text/plain') {
    return <Text size={24} className="text-foreground/80 shrink-0" />;
  }
  if (fileType.includes('audio')) {
    return <Headphones size={24} className="text-foreground/80 shrink-0" />;
  }
  return <Text size={24} className="text-foreground/80 shrink-0" />;
};