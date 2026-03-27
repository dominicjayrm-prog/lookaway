import { supabase } from '@/lib/supabase';

interface ApproveRequest { dates: string[]; status: 'live' | 'draft' | 'archived'; }

export async function POST(request: Request) {
  try {
    const { dates, status } = (await request.json()) as ApproveRequest;
    if (!Array.isArray(dates) || dates.length === 0) return Response.json({ error: 'dates required' }, { status: 400 });
    if (!['live', 'draft', 'archived'].includes(status)) return Response.json({ error: 'invalid status' }, { status: 400 });
    const update: Record<string, unknown> = { status, reviewed_at: new Date().toISOString() };
    if (status === 'live') update.published_at = new Date().toISOString();
    const { data, error } = await supabase.from('daily_challenges').update(update).in('challenge_date', dates).select('challenge_date');
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ updated: data?.length ?? 0 });
  } catch (err) { return Response.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 }); }
}
