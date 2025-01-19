// app/api/mindmaps/route.ts
import { createClient } from "@/utils/supabase/client";

export async function POST(req: Request) {
    const { name, parent_id, user_id } = await req.json();

    const { data, error } = await createClient()
        .from("mindmaps")
        .insert([{ name, parent_id, user_id }]);

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
        });
    }

    return new Response(JSON.stringify(data), { status: 201 });
}
export async function GET(req: Request) {
    const url = new URL(req.url);
    const user_id = url.searchParams.get('user_id');

    const { data, error } = await createClient()
        .from('mindmaps')
        .select('*')
        .eq('user_id', user_id);

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify(data), { status: 200 });
}