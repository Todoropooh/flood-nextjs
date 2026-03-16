'use client';

import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function StatusDonut({ logs, isDark }: { logs: any[], isDark: boolean }) {
  const lastLog = logs.length > 0 ? logs[logs.length - 1] : { level: 0 };
  
  // 🟢 ลิมิตน้ำไว้ที่ 20 ซม.
  let level = Number(lastLog.level) || 0;
  if (level > 20) level = 20; 
  if (level < 0) level = 0;

  // 🟢 กำหนดสีตามเกณฑ์ใหม่ (7 แดง, 3 ส้ม)
  let color = '#10b981'; // สีเขียว (ปกติ)
  let statusText = 'NORMAL';
  if (level >= 7.0) {
    color = '#ef4444'; // สีแดง
    statusText = 'CRITICAL';
  } else if (level >= 3.0) {
    color = '#f97316'; // สีส้ม
    statusText = 'WARNING';
  }

  const data = {
    labels: ['ระดับน้ำปัจจุบัน', 'พื้นที่ว่างในถัง'],
    datasets: [
      {
        data: [level, 20 - level],
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
      tooltip: { enabled: false }, // ปิด Tooltip เพราะเราจะโชว์เลขตรงกลางแทน
    },
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      <div className="absolute inset-0 flex items-center justify-center flex-col mt-4">
        <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">{statusText}</span>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-black" style={{ color: color }}>{level.toFixed(1)}</span>
          <span className="text-xs font-bold text-slate-500">cm</span>
        </div>
      </div>
      <Doughnut data={data} options={options} />
    </div>
  );
}