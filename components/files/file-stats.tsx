'use client'
import { FileData, StatCardProps } from "@/utils/types";
import { FileIcon, FileAudioIcon, Clock } from "lucide-react";
import { useRouter } from 'next/navigation';


function StatCard({ icon, label, value, subtitle, href }: StatCardProps) {
  const router = useRouter();
  
  const card = (
    <div className={`bg-accent/50 p-6 rounded-lg group h-[140px] flex flex-col justify-between ${
      href ? 'cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg hover:bg-accent' : ''
    }`}>
      <div className="flex items-center gap-3">
        <div className={href ? 'transition-transform duration-200 group-hover:scale-110' : ''}>
          {icon}
        </div>
        <h3 className="font-medium">{label}</h3>
      </div>
      <div>
        <p className="text-3xl font-bold">{value}</p>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <div onClick={() => router.push(href)} className="outline-none">
        {card}
      </div>
    );
  }

  return card;
}

export function FileStats({ files }: { files: FileData[] }) {
  const textFiles = files.filter(f => f.file_type === "text/plain").length;
  const audioFiles = files.filter(f => f.file_type.includes('audio')).length;
  
  // Get files uploaded in the last 7 days
  const recentFiles = files.filter(file => {
    const fileDate = new Date(file.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return fileDate >= weekAgo;
  }).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        icon={<FileIcon className="h-6 w-6" />}
        label="Text Files"
        value={textFiles}
        href="/files?type=text"
      />
      <StatCard
        icon={<FileAudioIcon className="h-6 w-6" />}
        label="Audio Files"
        value={audioFiles}
        href="/files?type=audio"
      />
      <StatCard
        icon={<Clock className="h-6 w-6" />}
        label="Recent Uploads"
        value={recentFiles}
        subtitle="Last 7 days"
      />
    </div>
  );
}