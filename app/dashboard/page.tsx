import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileGrid } from "@/components/files/file-grid";
import { FileStats } from "@/components/files/file-stats";

function LoadingFiles() {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <div 
          key={i} 
          className="p-4 bg-accent/30 animate-pulse rounded-lg h-[72px]"
        />
      ))}
    </div>
  );
}

async function FilesWrapper() {
  noStore();
  const supabase = await createClient();
  
  const { data: files } = await supabase
    .from("files")
    .select("*")
    .order("created_at", { ascending: false });
    
  return (
    <div className="space-y-6">
      <Card className="p-4">
        <CardHeader>
          <CardTitle>File Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <FileStats files={files || []} />
        </CardContent>
      </Card>
      <FileGrid files={files || []} />
    </div>
  );
}

export default async function ViewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  return (
    <div className="flex-1 w-full flex flex-col p-6 md:p-8">
      <div className="mb-8">
        <h1 className="font-bold text-3xl mb-1">View Files</h1>
        <p className="text-muted-foreground">
          View and manage your documents
        </p>
      </div>

      <Suspense fallback={<LoadingFiles />}>
        <FilesWrapper />
      </Suspense>
    </div>
  );
}
