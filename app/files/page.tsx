import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import FileGrid from "@/components/upload/file-grid";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import UploadModal from "@/components/upload/upload-modal";
import SearchForm from "@/components/files/SearchBar";

function LoadingFiles() {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="p-4 bg-accent/10 animate-pulse rounded-lg h-16"
        />
      ))}
    </div>
  );
}

async function FilesWrapper({ searchQuery }: { searchQuery: string }) {
  noStore();
  
  try {
    const supabase = await createClient();
    const { data: files, error } = await supabase
      .from("files")
      .select("*")
      .order("created_at", { ascending: false })
      .ilike('original_name', searchQuery ? `%${searchQuery}%` : '%')
      .limit(20);

    if (error) throw error;

    return (
      <div className="space-y-6">
        <FileGrid files={files} />
      </div>
    );
  } catch (error) {
    console.error("Error fetching files:", error);
    return (
      <div className="p-4 text-red-500 bg-red-50 rounded-lg">
        Error loading files. Please try again later.
      </div>
    );
  }
}

export default async function ViewPage({
  searchParams,
}: {
  searchParams: { search?: string };
}) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) throw error;
    if (!user) return redirect("/sign-in");

    const searchQuery = searchParams.search || "";

    return (
      <div className="flex-1 w-full flex flex-col p-4 md:p-8 max-w-5xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-bold text-3xl">Your Files</h1>
          <UploadModal>
            <Button size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Upload Files
            </Button>
          </UploadModal>
        </div>
        
        <SearchForm defaultValue={searchQuery} />

        <div className="mt-6">
          <Suspense fallback={<LoadingFiles />}>
            <FilesWrapper searchQuery={searchQuery} />
          </Suspense>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error loading user:", error);
    return (
      <div className="p-4 text-red-500 bg-red-50 rounded-lg">
        Error loading user data. Please try again later.
      </div>
    );
  }
}