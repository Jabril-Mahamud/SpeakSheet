import Link from "next/link";
import HeaderAuth from "./header-auth";
import NameHoverCard from "./common/HoverCard";
import { createClient } from "@/utils/supabase/server";

export default async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  return (
    <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
      <div className="w-full max-w-7xl flex justify-between items-center p-3 px-5 text-sm">
        <div className="flex gap-5 items-center font-semibold">
          <NameHoverCard />
          
          {/* Only show these links if user is logged in */}
          {user && (
            <>
              <Link href={"/files"}>Files</Link>
              <Link href={"/chat"}>Chat</Link>
            </>
          )}
          
          <div className="flex items-center gap-2"></div>
        </div>
        <HeaderAuth />
      </div>
    </nav>
  );
}