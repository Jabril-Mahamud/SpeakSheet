// components/files/FilesBrowser.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { FileList } from "@/components/files/FileList";
import { FileGrid } from "@/components/files/FileGrid";
import { NoFilesPlaceholder } from "@/components/files/NoFilesPlaceholder";
import {
  FileUp,
  Upload,
  Search,
  Grid,
  List,
  SlidersHorizontal,
  ArrowDownAZ,
  ArrowUpAZ,
  Calendar,
  X,
  Filter,
  Trash2,
  CheckSquare,
  Loader2,
  Headphones,
  File, // Added File here
} from "lucide-react";

interface FilesBrowserProps {
  files: any[];
  onViewFile: (file: any) => void;
  onFileUpdated: () => void;
}

export function FilesBrowser({
  files,
  onViewFile,
  onFileUpdated,
}: FilesBrowserProps) {
  const [filteredFiles, setFilteredFiles] = useState<any[]>(files);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<{
    field: string;
    direction: "asc" | "desc";
  }>({
    field: "created_at",
    direction: "desc",
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<
    "all" | "today" | "week" | "month"
  >("all");
  const [fileTypeFilter, setFileTypeFilter] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Apply filters and search when dependencies change
  useEffect(() => {
    applyFiltersAndSearch();
  }, [files, searchQuery, sortOption, dateFilter, fileTypeFilter]);

  const fileTypes = ["audio", "text"];

  const applyFiltersAndSearch = () => {
    let result = [...files];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (file) =>
          file.displayName.toLowerCase().includes(query) ||
          file.original_name.toLowerCase().includes(query)
      );
    }

    // Apply date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      result = result.filter((file) => {
        const fileDate = new Date(file.created_at);
        switch (dateFilter) {
          case "today":
            return fileDate >= today;
          case "week":
            return fileDate >= weekAgo;
          case "month":
            return fileDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    // Apply content type filter (audio or text)
    if (fileTypeFilter.length > 0) {
      result = result.filter((file) =>
        fileTypeFilter.includes(file.audio_file_path ? "audio" : "text")
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      let aVal = a[sortOption.field];
      let bVal = b[sortOption.field];

      // Handle special sorting for strings vs. dates
      if (
        sortOption.field === "created_at" ||
        sortOption.field === "updated_at"
      ) {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (typeof aVal === "string" && typeof bVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sortOption.direction === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredFiles(result);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);

    const formData = new FormData();

    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append("files", selectedFiles[i]);
    }

    try {
      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      toast({
        title: "Files uploaded successfully",
        description: `${data.fileIds.length} file(s) uploaded and processed.`,
      });

      // Refresh file list via callback
      onFileUpdated();
    } catch (error) {
      console.error("Error uploading files:", error);
      toast({
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteFile = async (id: string) => {
    try {
      const response = await fetch(`/api/files/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete file");
      }

      // Trigger refresh of files
      onFileUpdated();

      toast({
        title: "File deleted",
        description: "The file has been successfully deleted.",
      });
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "Delete failed",
        description: "Failed to delete the file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.length === 0) return;

    try {
      // Sequential deletion to ensure all files are processed
      for (const fileId of selectedFiles) {
        await fetch(`/api/files/${fileId}`, {
          method: "DELETE",
        });
      }

      // Refresh file list
      onFileUpdated();
      setSelectedFiles([]);

      toast({
        title: "Files deleted",
        description: `${selectedFiles.length} file(s) have been successfully deleted.`,
      });
    } catch (error) {
      console.error("Error deleting files:", error);
      toast({
        title: "Delete failed",
        description: "Failed to delete some files. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleConvertToSpeech = (file: any) => {
    // Navigate to chat page with file content
    router.push(`/chat?fileId=${file.id}`);
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles((prev) =>
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId]
    );
  };

  const toggleAllFiles = () => {
    if (selectedFiles.length === filteredFiles.length) {
      // Deselect all
      setSelectedFiles([]);
    } else {
      // Select all
      setSelectedFiles(filteredFiles.map((file) => file.id));
    }
  };

  return (
    <div>
      <div className="p-4 border-b">
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          {/* Search box */}
          <div className="relative w-full sm:w-3/5 lg:w-3/4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files by name..."
              className="pl-9 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto ml-auto">
            {/* File upload input */}
            <Input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileUpload}
              accept=".pdf,.txt,.doc,.docx"
              multiple
            />

            {/* Upload button */}
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="relative"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Files
                </>
              )}
            </Button>

            {/* Bulk delete button */}
            {selectedFiles.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                className="h-8"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete {selectedFiles.length}
              </Button>
            )}

            {/* Filters popover */}
            <Popover open={filterOpen} onOpenChange={setFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-10">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {(dateFilter !== "all" || fileTypeFilter.length > 0) && (
                    <Badge className="ml-2 bg-primary h-5 w-5 p-0 flex items-center justify-center">
                      {(dateFilter !== "all" ? 1 : 0) +
                        (fileTypeFilter.length > 0 ? 1 : 0)}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4">
                  {/* Date filter options */}
                  <div>
                    <h4 className="font-medium mb-2">Date Added</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={dateFilter === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDateFilter("all")}
                        className="w-full"
                      >
                        All Time
                      </Button>
                      <Button
                        variant={dateFilter === "today" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDateFilter("today")}
                        className="w-full"
                      >
                        Today
                      </Button>
                      <Button
                        variant={dateFilter === "week" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDateFilter("week")}
                        className="w-full"
                      >
                        This Week
                      </Button>
                      <Button
                        variant={dateFilter === "month" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDateFilter("month")}
                        className="w-full"
                      >
                        This Month
                      </Button>
                    </div>
                  </div>

                  {/* File type filters */}
                  <div>
                    <h4 className="font-medium mb-2">File Type</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {fileTypes.map((type) => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={`type-${type}`}
                            checked={fileTypeFilter.includes(type)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFileTypeFilter((prev) => [...prev, type]);
                              } else {
                                setFileTypeFilter((prev) =>
                                  prev.filter((t) => t !== type)
                                );
                              }
                            }}
                          />
                          <label
                            htmlFor={`type-${type}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {type.toUpperCase()}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Filter actions */}
                  <div className="flex justify-between pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDateFilter("all");
                        setFileTypeFilter([]);
                      }}
                    >
                      Reset Filters
                    </Button>
                    <Button size="sm" onClick={() => setFilterOpen(false)}>
                      Apply
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Sort dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-10">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() =>
                      setSortOption({ field: "displayName", direction: "asc" })
                    }
                    className={cn(
                      sortOption.field === "displayName" &&
                        sortOption.direction === "asc" &&
                        "bg-accent"
                    )}
                  >
                    <ArrowDownAZ className="mr-2 h-4 w-4" />
                    <span>Name (A-Z)</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      setSortOption({ field: "displayName", direction: "desc" })
                    }
                    className={cn(
                      sortOption.field === "displayName" &&
                        sortOption.direction === "desc" &&
                        "bg-accent"
                    )}
                  >
                    <ArrowUpAZ className="mr-2 h-4 w-4" />
                    <span>Name (Z-A)</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      setSortOption({ field: "created_at", direction: "desc" })
                    }
                    className={cn(
                      sortOption.field === "created_at" &&
                        sortOption.direction === "desc" &&
                        "bg-accent"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>Newest First</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      setSortOption({ field: "created_at", direction: "asc" })
                    }
                    className={cn(
                      sortOption.field === "created_at" &&
                        sortOption.direction === "asc" &&
                        "bg-accent"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>Oldest First</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View mode toggle */}
            <div className="border rounded-md flex">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                className="h-10 w-10 rounded-r-none"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Separator orientation="vertical" className="h-10" />
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                className="h-10 w-10 rounded-l-none"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Active filters display */}
        {(dateFilter !== "all" || fileTypeFilter.length > 0 || searchQuery) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {dateFilter !== "all" && (
              <Badge
                variant="outline"
                className="flex items-center gap-1 px-3 py-1"
              >
                <Calendar className="h-3 w-3" />
                {dateFilter === "today"
                  ? "Today"
                  : dateFilter === "week"
                    ? "This Week"
                    : "This Month"}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ml-1 p-0"
                  onClick={() => setDateFilter("all")}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}

            {fileTypeFilter.map((type) => (
              <Badge
                key={type}
                variant="outline"
                className="flex items-center gap-1 px-3 py-1"
              >
                {type === "audio" ? (
                  <Headphones className="h-3 w-3" />
                ) : (
                  <File className="h-3 w-3" />
                )}
                {type.toUpperCase()}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ml-1 p-0"
                  onClick={() =>
                    setFileTypeFilter((prev) => prev.filter((t) => t !== type))
                  }
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}

            {searchQuery && (
              <Badge
                variant="outline"
                className="flex items-center gap-1 px-3 py-1"
              >
                <Search className="h-3 w-3" />"{searchQuery}"
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ml-1 p-0"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}

            {(dateFilter !== "all" ||
              fileTypeFilter.length > 0 ||
              searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setDateFilter("all");
                  setFileTypeFilter([]);
                  setSearchQuery("");
                }}
              >
                Clear All
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Selection controls and file count */}
      <div className="mb-4 flex items-center justify-between px-6 pt-6">
        <div className="flex items-center">
          <Checkbox
            id="select-all"
            checked={
              filteredFiles.length > 0 &&
              selectedFiles.length === filteredFiles.length
            }
            onCheckedChange={toggleAllFiles}
            className="mr-2"
          />
          <label htmlFor="select-all" className="text-sm font-medium">
            {selectedFiles.length > 0
              ? `Selected ${selectedFiles.length} file(s)`
              : "Select All"}
          </label>
        </div>
        <p className="text-sm text-muted-foreground">
          {filteredFiles.length} file{filteredFiles.length !== 1 && "s"}
        </p>
      </div>

      {/* Files display - list or grid */}
      {filteredFiles.length === 0 ? (
        <NoFilesPlaceholder
          isEmpty={files.length === 0}
          onUpload={() => fileInputRef.current?.click()}
        />
      ) : viewMode === "list" ? (
        <FileList
          files={filteredFiles}
          selectedFiles={selectedFiles}
          onSelectFile={toggleFileSelection}
          onViewFile={onViewFile}
          onDeleteFile={handleDeleteFile}
          onConvertToSpeech={handleConvertToSpeech}
        />
      ) : (
        <FileGrid
          files={filteredFiles}
          selectedFiles={selectedFiles}
          onSelectFile={toggleFileSelection}
          onViewFile={onViewFile}
          onDeleteFile={handleDeleteFile}
          onConvertToSpeech={handleConvertToSpeech}
        />
      )}
    </div>
  );
}
