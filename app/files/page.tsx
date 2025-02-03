'use client';
import { Suspense } from "react";
import { createClient } from "@/utils/supabase/client";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type FileData } from "@/hooks/useFileManager";
import { FileDialog } from "@/components/files/FileDialog";
import { FileGrid } from "@/components/files/file-grid";
import { FileStats } from "@/components/files/file-stats";
import SearchForm from "@/components/files/SearchBar";
import UploadModal from "@/components/upload/upload-modal";
import { Button } from "@/components/ui/button";

function LoadingFiles() {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="p-4 bg-accent/30 animate-pulse rounded-lg h-[72px]"
        />
      ))}
    </div>
  );
}

async function FilesWrapper({ searchQuery }: { searchQuery?: string }) {
  noStore();
  const supabase = await createClient();

  const query = supabase
    .from("files")
    .select("*")
    .order("created_at", { ascending: false });

  if (searchQuery) {
    query.ilike("original_name", `%${searchQuery}%`);
  }

  const { data: files, error } = await query;

  if (error) {
    console.error("Error fetching files:", error);
    return (
      <div className="p-4 text-red-500 bg-red-50 rounded-lg">
        Error loading files. Please try again later.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex-1 w-full sm:w-auto max-w-md">
            <SearchForm />
          </div>
          <div className="flex gap-2">
            <UploadModal>
              <Button>
                Upload Files
              </Button>
            </UploadModal>
            <FileDialog 
              mode="upload"
              open={false}
              onOpenChange={() => {}}
            />
          </div>
        </div>
        <FileGrid files={files || []} />
      </div>
    </div>
  );
}

export default async function FilePage({
  searchParams,
}: {
  searchParams: { search?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return redirect("/sign-in");
  }

  const searchQuery = searchParams.search;

  return (
    <div className="flex-1 w-full flex flex-col p-6 md:p-8">
      <div className="mb-8">
        <h1 className="font-bold text-3xl mb-1">File Manager</h1>
        <p className="text-muted-foreground">
          Upload, manage and convert your files
        </p>
      </div>

      <Suspense fallback={<LoadingFiles />}>
        <FilesWrapper searchQuery={searchQuery} />
      </Suspense>
    </div>
  );
}
