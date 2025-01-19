// app/api/connections/route.ts
import { createClient } from '@/utils/supabase/client';

export async function POST(req: Request) {
    const { mindmap_id, from_node_id, to_node_id } = await req.json();

    const { data, error } = await createClient()
        .from('connections')
        .insert([{ mindmap_id, from_node_id, to_node_id }]);

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify(data), { status: 201 });
}
