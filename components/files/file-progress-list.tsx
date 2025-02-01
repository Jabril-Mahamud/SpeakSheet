import { FileProgressListProps, UploadProgress } from "@/utils/types";
import { FileProgressItem } from "./file-progress-item";

export function FileProgressList({
  files,
  uploadProgress,
  convertedFiles,
  onUpdateProgress,
  onConvertComplete,
  onConvertError,
}: FileProgressListProps) {
  const getStatusText = (status: UploadProgress["status"]) => {
    const statusMap = {
      uploading: "Uploading...",
      converting: "Converting PDF...",
      processing: "Processing...",
      complete: "Complete",
      error: "Error",
    };
    return statusMap[status] || "Processing...";
  };

  return (
    <div className="bg-accent/50 p-3 rounded-md space-y-4">
      <h3 className="font-medium">Files:</h3>
      <div className="space-y-4">
        {Array.from(files).map((file, i) => {
          const progress = uploadProgress[file.name];
          const showButtons = !!(progress?.status === "complete" && progress.fileRecord); // Fixed here
          const isText = file.type.includes("pdf");

          return (
            <FileProgressItem
              key={i}
              file={file}
              progress={progress}
              showButtons={showButtons}
              isText={isText}
              convertedText={convertedFiles[file.name]}
              onUpdateProgress={onUpdateProgress}
              onConvertComplete={onConvertComplete}
              onConvertError={onConvertError}
              getStatusText={getStatusText}
            />
          );
        })}
      </div>
    </div>
  );
}