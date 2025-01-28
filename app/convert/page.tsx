// app/convert/page.tsx
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import ConversionInterface from "../../components/conversion/conversion-interface";

export default async function ConvertPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Fetch only PDF files
  const { data: files } = await supabase
    .from('user_files')
    .select('*')
    .eq('file_type', 'application/pdf')
    .order('created_at', { ascending: false });

  return (
    <div className="flex-1 w-full flex flex-col p-6 md:p-8">
      <div className="flex justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="font-bold text-3xl mb-1">PDF to Audio</h1>
          <p className="text-muted-foreground">
            Convert your PDF documents to natural-sounding audio
          </p>
        </div>
      </div>

      <ConversionInterface initialFiles={files || []} />
    </div>
  );
}