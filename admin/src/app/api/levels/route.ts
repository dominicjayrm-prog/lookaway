import { supabase } from '@/lib/supabase';

// GET /api/levels?world=1 — list levels, optionally filtered by world
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const world = url.searchParams.get('world');

    let query = supabase
      .from('campaign_levels')
      .select('*')
      .order('world_id')
      .order('level_number');

    if (world) {
      query = query.eq('world_id', Number(world));
    }

    const { data, error } = await query;
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ levels: data });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/levels — create or update a level
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, world_id, level_number, title, view_time, difficulty, scene_data, status } = body;

    if (!id || !world_id || !level_number) {
      return Response.json({ error: 'id, world_id, and level_number are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('campaign_levels')
      .upsert({
        id,
        world_id,
        level_number,
        title: title || 'Untitled',
        view_time: view_time || 4.0,
        difficulty: difficulty || 'medium',
        scene_data: scene_data || { objects: [], questions: [] },
        status: status || 'draft',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ level: data });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/levels — delete a level
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;
    if (!id) return Response.json({ error: 'id is required' }, { status: 400 });

    const { error } = await supabase.from('campaign_levels').delete().eq('id', id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
