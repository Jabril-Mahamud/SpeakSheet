// app/api/nodes/route.ts
import { createClient } from '@/utils/supabase/client';

export async function POST(req: Request) {
    const { mindmap_id, content, position } = await req.json();

    const { data, error } = await createClient()
        .from('nodes')
        .insert([{ mindmap_id, content, position }]);

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify(data), { status: 201 });
}
