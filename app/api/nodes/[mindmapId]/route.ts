// app/api/nodes/[mindmapId]/route.ts

import { createClient } from '@/utils/supabase/client';

export async function GET(req: Request, { params }: { params: { mindmapId: string } }) {
    const { mindmapId } = params;

    const { data, error } = await createClient()
        .from('nodes')
        .select('*')
        .eq('mindmap_id', mindmapId);

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify(data), { status: 200 });
}
