'use client';

import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function StatusDonut({ logs, isDark }: { logs: any[], isDark: boolean }) {
  // 1. รับค่าล่าสุด (ถ้าไม่มีให้ใช้ 84.0 คือระดับเซนเซอร์เริ่มต้น)
  const lastLog = logs.length > 0 ? logs[logs.length - 1] : { level: 84.0 };
  const rawDist = Number(lastLog.level) || 84.0;

  // 2. คำนวณระดับน้ำจริงด้วยสูตรเดียวกับหน้าหลัก (V4.4)
  let waterLevel = (84.0 - rawDist) - 5.0;
  
  // จัดการค่า Noise และล็อกเพดานที่ 40 ซม.
  if (rawDist <= 0.5 || rawDist > 90) waterLevel = 0;
  if (waterLevel > 40) waterLevel = 40;
  if (waterLevel < 0) waterLevel = 0;

  // 3. กำหนดสีและสถานะตามเกณฑ์ใหม่ (แดง >= 10, ส้ม >= 5)
  let color = '#10b981'; // 🟢 STABLE
  let statusText = 'STABLE';
  
  if (waterLevel >= 10.0) {
    color = '#ef4444'; // 🔴 CRITICAL
    statusText = 'CRITICAL';
  } else if (waterLevel >= 5.0) {
    color = '#f97316'; // 🟠 WARNING
    statusText = 'WARNING';
  }

  // 4. เตรียมข้อมูลกราฟวงแหวน (น้ำที่มี : พื้นที่ว่างที่เหลือถึง 40 ซม.)
  const data = {
    labels: ['ระดับน้ำปัจจุบัน', 'พื้นที่ว่าง'],
    datasets: [
      {
        data: [waterLevel, 40 - waterLevel], 
        backgroundColor: [color, isDark ? '#1e293b' : '#f1f5f9'],
        borderWidth: 0,
        cutout: '80%',
        circumference: 270,
        rotation: 225,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      <div className="absolute inset-0 flex items-center justify-center flex-col pt-4">
        <span className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">{statusText}</span>
        <div className="flex items-baseline gap-1">
          <span className="text-5xl font-black transition-colors duration-500" style={{ color: color }}>
            {waterLevel.toFixed(1)}
          </span>
          <span className="text-xs font-bold text-slate-500 uppercase">cm</span>
        </div>
      </div>
      <Doughnut data={data} options={options} />
    </div>
  );
}