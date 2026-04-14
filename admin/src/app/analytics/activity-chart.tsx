'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  data: { date: string; dau: number; wau: number; mau: number }[];
}

export function ActivityChart({ data }: Props) {
  // Show MM-DD only on the axis to keep it compact.
  const formatted = data.map((d) => ({ ...d, label: d.date.slice(5) }));
  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={formatted} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          <XAxis dataKey="label" tick={{ fill: '#636E72', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#EDEBE6' }} />
          <YAxis tick={{ fill: '#636E72', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#EDEBE6' }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }}
            labelStyle={{ color: '#1A1A18', fontWeight: 600 }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="dau" name="DAU" stroke="#6C5CE7" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="wau" name="WAU" stroke="#0984E3" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          <Line type="monotone" dataKey="mau" name="MAU" stroke="#00B894" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
