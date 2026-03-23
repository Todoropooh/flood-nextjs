'use client';
import { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

interface MiniChartProps {
  data: any[];
  color?: string;
  installHeight?: number; // 🌟 เพิ่มการรับค่าระยะติดตั้ง
}

export default function MiniChart({ data = [], color = "#3b82f6", installHeight = 62.0 }: MiniChartProps) {
  
  // 🌟 คำนวณข้อมูลใหม่ก่อนส่งให้กราฟวาด (แปลงระยะห่าง -> ระดับน้ำ)
  const processedData = useMemo(() => {
    return data.map(item => {
      const raw = Number(item.level ?? installHeight);
      let wl = (installHeight - raw);
      
      // กรอง Noise เหมือนหน้าหลัก
      if (raw <= 0.5 || raw > (installHeight + 10)) wl = 0;
      if (wl < 0) wl = 0;
      if (wl > 40) wl = 40;

      return {
        ...item,
        displayLevel: wl // ใช้ค่านี้ในการวาดกราฟแทน
      };
    });
  }, [data, installHeight]);

  return (
    <div className="h-16 w-full mt-2 opacity-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={processedData}>
          <YAxis hide domain={[0, 40]} /> 
          <Line 
            type="monotone" 
            dataKey="displayLevel" // 🌟 เปลี่ยนมาใช้ค่าที่คำนวณแล้ว
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