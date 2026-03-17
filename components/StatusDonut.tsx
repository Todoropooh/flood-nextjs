'use client';

import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function StatusDonut({ logs, isDark }: { logs: any[], isDark: boolean }) {
  const lastLog = logs.length > 0 ? logs[logs.length - 1] : { level: 70 }; // ค่าเริ่มต้นคือ 70 (ถังว่าง)
  
  // ✅ 1. รับค่าระยะห่างเซนเซอร์ (เช่น 54, 61, 70)
  const rawDist = Number(lastLog.level) || 70;

  // ✅ 2. คำนวณน้ำในถัง (ติดตั้ง 70 ซม. ถังสูง 20 ซม.)
  let waterInTank = 70 - rawDist;
  if (waterInTank > 20) waterInTank = 20; 
  if (waterInTank < 0) waterInTank = 0;

  // ✅ 3. กำหนดสีและข้อความตามระยะห่าง
  let color = '#10b981'; // สีเขียว (ปกติ)
  let statusText = 'NORMAL';
  
  if (rawDist <= 54) {
    color = '#ef4444'; // สีแดง (วิกฤต - น้ำเต็ม)
    statusText = 'CRITICAL';
  } else if (rawDist <= 61) {
    color = '#f97316'; // สีส้ม (เตือน - น้ำครึ่งถัง)
    statusText = 'WARNING';
  }

  // ✅ 4. วาดกราฟวงแหวนด้วยค่าน้ำในถัง (0-20 ซม.)
  const data = {
    labels: ['ระดับน้ำปัจจุบัน', 'พื้นที่ว่างในถัง'],
    datasets: [
      {
        data: [waterInTank, 20 - waterInTank], // สัดส่วนน้ำ : สัดส่วนที่ว่าง
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
      tooltip: { enabled: false }, // ปิด Tooltip โชว์เลขตรงกลางแทน
    },
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      <div className="absolute inset-0 flex items-center justify-center flex-col mt-4">
        <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">{statusText}</span>
        <div className="flex items-baseline gap-1">
          {/* ✅ แสดงตัวเลขน้ำในถังจริงตรงกลางวงแหวน */}
          <span className="text-4xl font-black" style={{ color: color }}>{waterInTank.toFixed(1)}</span>
          <span className="text-xs font-bold text-slate-500">cm</span>
        </div>
      </div>
      <Doughnut data={data} options={options} />
    </div>
  );
}