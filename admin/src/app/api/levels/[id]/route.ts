import { supabase } from '@/lib/supabase';

// GET /api/levels/[id] — get a single level
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from('campaign_levels')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return Response.json({ error: error.message }, { status: 404 });
    return Response.json({ level: data });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
