'use client';
import React from 'react';

interface WaterTankProps {
  level: number;
  warningThreshold?: number;
  criticalThreshold?: number;
}

export default function WaterTank({ 
  level = 0, 
  warningThreshold = 5, 
  criticalThreshold = 10 
}: WaterTankProps) {
  
  // 🌟 ปรับความสูงถังน้ำจำลองให้รองรับระดับที่สูงกว่า 40cm (เผื่อกรณีน้ำท่วมสูง)
  // โดยให้ความสูงถัง (Max) อิงตามค่า Critical + 10cm เพื่อให้เห็นส่วนต่าง
  const maxDisplayLevel = criticalThreshold + 10; 
  
  const safeLevel = Math.max(0, level);
  const fillPercentage = Math.min(100, (safeLevel / maxDisplayLevel) * 100);

  // 🌟 ใช้เกณฑ์สีแบบ Dynamic ที่ส่งมาจากหน้าหลัก (ซึ่งดึงมาจาก Admin อีกที)
  let waterColor = 'from-emerald-400 to-emerald-600';
  let statusText = 'STABLE';
  let textColor = 'text-emerald-500';

  if (safeLevel >= criticalThreshold) { // 🔴 อันตราย
    waterColor = 'from-red-400 to-red-600';
    statusText = 'CRITICAL';
    textColor = 'text-red-500';
  } else if (safeLevel >= warningThreshold) { // 🟠 เฝ้าระวัง
    waterColor = 'from-orange-400 to-orange-600';
    statusText = 'WARNING';
    textColor = 'text-orange-500';
  }

  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl h-full flex flex-col items-center justify-between transition-all duration-500">
      <div className="flex justify-between w-full">
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Live Tank View</span>
        <span className={`text-[10px] font-black px-2 py-1 rounded-lg border ${textColor} bg-slate-50 dark:bg-white/5 uppercase transition-colors`}>
          {statusText}
        </span>
      </div>
      
      {/* วาดถังน้ำ */}
      <div className="relative w-32 h-72 bg-slate-100 dark:bg-slate-800 border-4 border-slate-200 dark:border-slate-700 rounded-b-[2rem] overflow-hidden flex items-end shadow-inner mt-4">
        {/* เลเยอร์น้ำ */}
        <div 
          className={`w-full bg-gradient-to-t ${waterColor} transition-all duration-1000 relative shadow-[0_0_20px_rgba(0,0,0,0.1)]`} 
          style={{ height: `${fillPercentage}%` }}
        >
           {/* ฟองอากาศ/คลื่นผิวน้ำ */}
           <div className="absolute top-0 left-0 w-full h-2 bg-white/30 animate-pulse"></div>
           <div className="absolute inset-0 bg-white/10 overflow-hidden">
              <div className="w-full h-full animate-[wave_3s_infinite_linear] opacity-20 bg-[linear-gradient(45deg,transparent_25%,white_50%,transparent_75%)] bg-[length:50px_50px]"></div>
           </div>
        </div>
      </div>

      <div className="mt-6 text-center">
         <div className={`text-5xl font-black ${textColor} transition-colors tabular-nums`}>
           {safeLevel.toFixed(1)}
         </div>
         <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">centimeters</div>
      </div>
    </div>
  );
}