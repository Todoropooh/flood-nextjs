'use client';

import React from 'react';
import { Waves } from 'lucide-react';

export default function WaterTank({ level = 0 }: { level: number }) {
  // 1. ล็อกค่าน้ำให้อยู่ในช่วง 0-20 ซม.
  const safeLevel = Math.max(0, Math.min(20, level));
  
  // 2. คำนวณเป็นเปอร์เซ็นต์ (เอาไปดันกราฟิกน้ำให้สูงขึ้น)
  const fillPercentage = (safeLevel / 20) * 100;

  // 3. กำหนดสีน้ำตามระยะเตือน (10 และ 17 ซม.)
  let waterColor = 'from-blue-400 to-blue-600'; // สีปกติ (เขียว/ฟ้า)
  let waveColor = 'bg-blue-300';
  let statusText = 'NORMAL';
  let textColor = 'text-blue-600';

  if (safeLevel >= 17) {
    waterColor = 'from-red-400 to-red-600';
    waveColor = 'bg-red-300';
    statusText = 'CRITICAL';
    textColor = 'text-red-600';
  } else if (safeLevel >= 10) {
    waterColor = 'from-orange-400 to-orange-600';
    waveColor = 'bg-orange-300';
    statusText = 'WARNING';
    textColor = 'text-orange-600';
  }

  // สร้างสเกลข้างถัง 20, 15, 10, 5, 0
  const markers = [20, 15, 10, 5, 0];

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center h-full min-h-[350px]">
      
      {/* หัวการ์ด */}
      <div className="w-full flex justify-between items-center mb-6">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <Waves size={18} className="text-blue-500"/> Live Tank View
        </h3>
        <span className={`text-[10px] font-black tracking-widest px-2 py-1 rounded-md uppercase bg-slate-50 dark:bg-slate-800 ${textColor}`}>
          {statusText}
        </span>
      </div>

      {/* กราฟิกถังน้ำ */}
      <div className="relative flex-grow w-full max-w-[140px] flex justify-center">
        {/* สเกลด้านซ้าย */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between py-[2px] pr-2 text-[10px] font-bold text-slate-400 h-full z-10">
          {markers.map((mark) => (
            <div key={mark} className="flex items-center gap-1">
              <span>{mark}</span>
              <div className="w-2 border-b-2 border-slate-300 dark:border-slate-600"></div>
            </div>
          ))}
        </div>

        {/* ตัวถัง (Glass effect) */}
        <div className="relative w-24 h-full bg-slate-50 dark:bg-slate-800 rounded-b-3xl rounded-t-sm border-4 border-slate-200 dark:border-slate-700 overflow-hidden shadow-inner flex items-end ml-6">
          
          {/* อนิเมชันน้ำ */}
          <div 
            className={`w-full bg-gradient-to-t ${waterColor} transition-all duration-1000 ease-in-out relative shadow-[0_0_15px_rgba(0,0,0,0.1)]`}
            style={{ height: `${fillPercentage}%` }}
          >
            {/* คลื่นน้ำด้านบน */}
            <div className={`absolute top-0 left-0 w-full h-1.5 ${waveColor} opacity-80`}></div>
            {/* ฟองอากาศตกแต่ง */}
            <div className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce"></div>
            <div className="absolute bottom-6 right-4 w-2 h-2 bg-white/30 rounded-full animate-pulse"></div>
            <div className="absolute top-4 left-4 w-1 h-1 bg-white/50 rounded-full animate-ping"></div>
          </div>

        </div>
      </div>

      {/* ตัวเลขด้านล่าง */}
      <div className="mt-6 text-center">
        <div className="flex items-baseline justify-center gap-1">
          <span className={`text-4xl font-black ${textColor}`}>
            {safeLevel.toFixed(1)}
          </span>
          <span className="text-sm font-bold text-slate-500">cm</span>
        </div>
        <p className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-widest">
          Current Water Level
        </p>
      </div>
    </div>
  );
}