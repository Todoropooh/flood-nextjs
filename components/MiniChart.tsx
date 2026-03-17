'use client';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

export default function MiniChart({ data, color = "#3b82f6" }: { data: any[], color?: string }) {
  return (
    <div className="h-16 w-full mt-2 opacity-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis hide domain={['auto', 'auto']} />
          <Line 
            type="monotone" 
            dataKey="level" 
            stroke={color} 
            strokeWidth={2} 
            dot={false} 
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}