import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import UploadModal from "../../components/upload/upload-modal";
import FileList from "../../components/upload/file-list";
import { Plus } from "lucide-react";

export default async function UploadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  const { data: files } = await supabase
    .from('user_files')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="flex-1 w-full flex flex-col p-6 md:p-8">
      <div className="flex justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="font-bold text-3xl mb-1">Your Files</h1>
          <p className="text-muted-foreground">
            Manage your uploaded documents
          </p>
        </div>
        
        <UploadModal>
          <button className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md flex items-center gap-2">
            <Plus size={20} />
            Upload Files
          </button>
        </UploadModal>
      </div>

      <FileList initialFiles={files || []} />
      
      {/* Floating Action Button for mobile */}
      <div className="md:hidden fixed bottom-8 right-8">
        <UploadModal>
          <button className="bg-primary text-primary-foreground hover:bg-primary/90 h-14 w-14 rounded-full flex items-center justify-center shadow-lg">
            <Plus size={24} />
          </button>
        </UploadModal>
      </div>
    </div>
  );
}