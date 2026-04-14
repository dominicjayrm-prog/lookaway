'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: { range: string; count: number }[];
}

export function StreakChart({ data }: Props) {
  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
          <XAxis dataKey="range" tick={{ fill: '#636E72', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#EDEBE6' }} />
          <YAxis tick={{ fill: '#636E72', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#EDEBE6' }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }}
            labelStyle={{ color: '#1A1A18', fontWeight: 600 }}
            cursor={{ fill: 'rgba(108, 92, 231, 0.06)' }}
          />
          <Bar dataKey="count" fill="#D4A012" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
