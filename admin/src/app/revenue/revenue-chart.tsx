'use client';

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  data: { date: string; revenue: number; units: number }[];
}

export function RevenueChart({ data }: Props) {
  const formatted = data.map((d) => ({ ...d, label: d.date.slice(5) }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={formatted} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} stroke="#CBD5E1" />
        <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94A3B8' }} stroke="#CBD5E1" tickFormatter={(v) => `$${v}`} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#94A3B8' }} stroke="#CBD5E1" />
        <Tooltip
          contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12 }}
          formatter={(value: number, name: string) => name === 'revenue' ? [`$${value.toFixed(2)}`, 'Revenue'] : [value, 'Units']}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar yAxisId="left" dataKey="revenue" fill="#00B894" radius={[4, 4, 0, 0]} />
        <Line yAxisId="right" type="monotone" dataKey="units" stroke="#6C5CE7" strokeWidth={2} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
