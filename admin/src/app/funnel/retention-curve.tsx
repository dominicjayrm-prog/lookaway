'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Label } from 'recharts';

interface Props {
  data: { day: number; pct: number }[];
}

export function RetentionCurve({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 10, fill: '#94A3B8' }}
          stroke="#CBD5E1"
          label={{ value: 'Days since signup', position: 'insideBottom', offset: -5, fontSize: 11, fill: '#64748B' }}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#94A3B8' }}
          stroke="#CBD5E1"
          tickFormatter={(v) => `${v}%`}
          domain={[0, 100]}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12 }}
          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Retained']}
          labelFormatter={(v) => `Day ${v}`}
        />
        {/* Industry-benchmark reference lines */}
        <ReferenceLine y={40} stroke="#FF6B6B" strokeDasharray="4 4" opacity={0.4}>
          <Label value="D1 ~40% (good)" position="insideTopRight" fontSize={9} fill="#FF6B6B" />
        </ReferenceLine>
        <ReferenceLine y={20} stroke="#D4A012" strokeDasharray="4 4" opacity={0.4}>
          <Label value="D7 ~20% (good)" position="insideTopRight" fontSize={9} fill="#D4A012" />
        </ReferenceLine>
        <Line type="monotone" dataKey="pct" stroke="#6C5CE7" strokeWidth={2.5} dot={{ r: 3, fill: '#6C5CE7' }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
