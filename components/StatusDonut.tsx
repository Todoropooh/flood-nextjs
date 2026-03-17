'use client';

import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function StatusDonut({ logs, isDark }: { logs: any[], isDark: boolean }) {
  // ค่าเริ่มต้นถ้ายังไม่มีข้อมูล ให้ถือว่าเซนเซอร์อ่านได้ 70 (ถังว่าง)
  const lastLog = logs.length > 0 ? logs[logs.length - 1] : { level: 70 };
  
  // 1. รับค่าระยะจากเซนเซอร์ (เช่น 70, 60, 53)
  const rawDist = Number(lastLog.level) || 70;

  // 2. คำนวณความสูงน้ำ (เซนเซอร์ติดตั้งสูง 70 ซม.)
  let waterInTank = 70 - rawDist;
  
  // 3. ล็อกเพดานความสูงถังไว้ที่ 20 ซม. (เพื่อให้กราฟวงแหวนวาดฐานที่ 20)
  if (waterInTank > 20) waterInTank = 20; 
  if (waterInTank < 0) waterInTank = 0;

  // 4. ตั้งเงื่อนไขแจ้งเตือนจาก "ความสูงน้ำ" (ดูง่ายสุดๆ)
  let color = '#10b981'; // สีเขียว (ปกติ)
  let statusText = 'NORMAL';
  
  if (waterInTank >= 17) {
    // 🔴 ถ้าน้ำสูง 17 ซม. ขึ้นไป = วิกฤต
    color = '#ef4444'; 
    statusText = 'CRITICAL';
  } else if (waterInTank >= 10) {
    // 🟠 ถ้าน้ำสูง 10 ซม. ขึ้นไป = เตือน
    color = '#f97316'; 
    statusText = 'WARNING';
  }

  // 5. วาดกราฟวงแหวน (น้ำที่มี : พื้นที่ว่างที่เหลือถึง 20 ซม.)
  const data = {
    labels: ['ระดับน้ำปัจจุบัน', 'พื้นที่ว่างในถัง'],
    datasets: [
      {
        data: [waterInTank, 20 - waterInTank], 
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
      tooltip: { enabled: false }, // ปิด Tooltip ใช้เลขตรงกลางแทน
    },
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      <div className="absolute inset-0 flex items-center justify-center flex-col mt-4">
        <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">{statusText}</span>
        <div className="flex items-baseline gap-1">
          {/* โชว์ความสูงน้ำจริงตรงกลางวงแหวน */}
          <span className="text-4xl font-black" style={{ color: color }}>{waterInTank.toFixed(1)}</span>
          <span className="text-xs font-bold text-slate-500">cm</span>
        </div>
      </div>
      <Doughnut data={data} options={options} />
    </div>
  );
}