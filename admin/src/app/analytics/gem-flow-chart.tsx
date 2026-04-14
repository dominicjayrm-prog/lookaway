'use client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  data: { date: string; earn: number; spend: number; net: number }[];
}

export function GemFlowChart({ data }: Props) {
  const formatted = data.map((d) => ({ ...d, label: d.date.slice(5) }));
  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <AreaChart data={formatted} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="earn-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00B894" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#00B894" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="spend-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF6B6B" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#FF6B6B" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          <XAxis dataKey="label" tick={{ fill: '#636E72', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#EDEBE6' }} />
          <YAxis tick={{ fill: '#636E72', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#EDEBE6' }} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }}
            labelStyle={{ color: '#1A1A18', fontWeight: 600 }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="earn" name="Earned" stackId="1" stroke="#00B894" strokeWidth={2} fill="url(#earn-grad)" />
          <Area type="monotone" dataKey="spend" name="Spent" stackId="2" stroke="#FF6B6B" strokeWidth={2} fill="url(#spend-grad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
