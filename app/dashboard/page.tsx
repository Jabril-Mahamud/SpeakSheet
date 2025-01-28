import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import FileStats from "../../components/upload/file-stats";
import FileGrid from "../../components/upload/file-grid";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Fetch user's files with stats
  const { data: files } = await supabase
    .from('user_files')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="flex-1 w-full flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <h1 className="font-bold text-2xl">Dashboard</h1>
      </div>

      <FileStats files={files || []} />
      <FileGrid files={files || []} />
    </div>
  );
}