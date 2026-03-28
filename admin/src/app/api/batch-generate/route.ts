import { supabase } from '@/lib/supabase';

const WEEKDAY_MODES: Record<number,string> = {0:'classic',1:'classic',2:'speed',3:'classic',4:'spot_the_change',5:'classic',6:'speed'};

export async function POST(request: Request) {
  try {
    const { startDate, endDate } = await request.json();
    if (!startDate || !endDate) return Response.json({ error: 'startDate and endDate required' }, { status: 400 });

    const start = new Date(startDate + 'T00:00:00Z');
    const end = new Date(endDate + 'T00:00:00Z');
    const dates: string[] = [];
    const d = new Date(start);
    while (d <= end) {
      dates.push(d.toISOString().split('T')[0]);
      d.setDate(d.getDate() + 1);
    }

    const { data: existing } = await supabase.from('daily_challenges').select('challenge_date').in('challenge_date', dates);
    const existingSet = new Set((existing ?? []).map((c: any) => c.challenge_date));

    let generated = 0, skipped = 0;
    const challenges: any[] = [];

    for (const dateStr of dates) {
      if (existingSet.has(dateStr)) { skipped++; continue; }
      const dayOfWeek = new Date(dateStr + 'T00:00:00Z').getUTCDay();
      const mode = WEEKDAY_MODES[dayOfWeek] || 'classic';

      const res = await fetch(new URL('/api/generate', request.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr, mode, difficulty: 'medium' }),
      });

      if (res.ok) {
        const data = await res.json();
        challenges.push(data.challenge);
        generated++;
      }
    }

    return Response.json({ generated, skipped, total: dates.length, challenges });
  } catch (err: any) {
    return Response.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}
