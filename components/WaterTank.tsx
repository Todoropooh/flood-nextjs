'use client';
import React from 'react';

export default function WaterTank({ level = 0 }: { level: number }) {
  const safeLevel = Math.max(0, Math.min(40, level));
  const fillPercentage = (safeLevel / 40) * 100;

  // 🌟 ปรับเกณฑ์ถังน้ำให้ตรงกับหน้าหลัก: แดง >= 10, ส้ม >= 5
  let waterColor = 'from-emerald-400 to-emerald-600';
  let statusText = 'STABLE';
  let textColor = 'text-emerald-500';

  if (safeLevel >= 10) { // 🔴 13.9 จะตกเงื่อนไขนี้ เป็นสีแดงทันที
    waterColor = 'from-red-400 to-red-600';
    statusText = 'CRITICAL';
    textColor = 'text-red-500';
  } else if (safeLevel >= 5) {
    waterColor = 'from-orange-400 to-orange-600';
    statusText = 'WARNING';
    textColor = 'text-orange-500';
  }

  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl h-full flex flex-col items-center justify-between">
      <div className="flex justify-between w-full">
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Live Tank View</span>
        <span className={`text-[10px] font-black px-2 py-1 rounded-lg border ${textColor} bg-slate-50 dark:bg-white/5 uppercase`}>{statusText}</span>
      </div>
      
      {/* วาดถังน้ำ */}
      <div className="relative w-32 h-72 bg-slate-100 dark:bg-slate-800 border-4 border-slate-200 dark:border-slate-700 rounded-b-[2rem] overflow-hidden flex items-end shadow-inner mt-4">
        <div className={`w-full bg-gradient-to-t ${waterColor} transition-all duration-1000 relative`} style={{ height: `${fillPercentage}%` }}>
           <div className="absolute top-0 left-0 w-full h-2 bg-white/20 animate-pulse"></div>
        </div>
      </div>

      <div className="mt-6 text-center">
         <div className={`text-5xl font-black ${textColor}`}>{safeLevel.toFixed(1)}</div>
         <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">centimeters</div>
      </div>
    </div>
  );
}