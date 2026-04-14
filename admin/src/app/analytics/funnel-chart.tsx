'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts';

interface Props {
  data: { world: number; reached: number; pctOfTotal: number }[];
}

const WORLD_NAMES: Record<number, string> = {
  1: 'Shapes',
  2: 'Colour',
  3: 'Numbers',
  4: 'Motion',
  5: 'Photo',
  6: 'Mastermind',
};

const WORLD_COLOURS: Record<number, string> = {
  1: '#00B894',
  2: '#0984E3',
  3: '#6C5CE7',
  4: '#F9A825',
  5: '#FF6B6B',
  6: '#D4A012',
};

export function FunnelChart({ data }: Props) {
  const formatted = data.map((d) => ({
    name: `W${d.world} ${WORLD_NAMES[d.world] ?? ''}`.trim(),
    pct: d.pctOfTotal,
    reached: d.reached,
    fill: WORLD_COLOURS[d.world] ?? '#6C5CE7',
  }));

  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <BarChart data={formatted} layout="vertical" margin={{ top: 10, right: 40, bottom: 0, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: '#636E72', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#EDEBE6' }} unit="%" />
          <YAxis dataKey="name" type="category" tick={{ fill: '#636E72', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#EDEBE6' }} width={110} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }}
            labelStyle={{ color: '#1A1A18', fontWeight: 600 }}
            cursor={{ fill: 'rgba(108, 92, 231, 0.06)' }}
            formatter={(_v, _name, props) => [`${props.payload.pct}% (${props.payload.reached} players)`, 'Reached']}
          />
          <Bar dataKey="pct" radius={[0, 6, 6, 0]}>
            <LabelList dataKey="pct" position="right" formatter={(v: number) => `${v}%`} style={{ fill: '#1A1A18', fontSize: 11, fontWeight: 600 }} />
            {formatted.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
