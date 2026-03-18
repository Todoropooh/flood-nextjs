'use client';

import React from 'react';
import { Waves } from 'lucide-react';

export default function WaterTank({ level = 0 }) {

  const safeLevel = Math.max(0, Math.min(40, level));
  const fillPercentage = (safeLevel / 40) * 100;

  let waterColor = 'from-emerald-400 to-emerald-600';
  let waveColor = 'bg-emerald-300';
  let statusText = 'STABLE';
  let textColor = 'text-emerald-500';

  if (safeLevel >= 20) {
    waterColor = 'from-red-400 to-red-600';
    waveColor = 'bg-red-300';
    statusText = 'CRITICAL';
    textColor = 'text-red-500';
  } else if (safeLevel >= 10) {
    waterColor = 'from-orange-400 to-orange-600';
    waveColor = 'bg-orange-300';
    statusText = 'WARNING';
    textColor = 'text-orange-500';
  }

  const markers = [40, 30, 20, 10, 0];

  return (
    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-6 rounded-2xl border shadow-lg flex flex-col items-center h-full min-h-[350px]">

      {/* HEADER */}
      <div className="w-full flex justify-between items-center mb-6">
        <h3 className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <Waves size={18} className="text-blue-500 animate-pulse"/> Live Tank
        </h3>

        <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase bg-slate-100 dark:bg-slate-800 ${textColor}`}>
          {statusText}
        </span>
      </div>

      {/* TANK */}
      <div className="relative flex-grow w-full max-w-[140px] flex justify-center">

        {/* SCALE */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between py-[2px] pr-2 text-[10px] font-bold text-slate-400 h-full z-10">
          {markers.map((mark) => (
            <div key={mark} className="flex items-center gap-1">
              <span>{mark}</span>
              <div className="w-2 border-b-2 border-slate-300 dark:border-slate-600"></div>
            </div>
          ))}
        </div>

        {/* GLASS */}
        <div className="relative w-24 h-full bg-slate-50 dark:bg-slate-800 rounded-b-3xl rounded-t-sm border-4 border-slate-200 dark:border-slate-700 overflow-hidden shadow-inner flex items-end ml-6">

          {/* WATER */}
          <div
            className={`
              w-full bg-gradient-to-t ${waterColor}
              transition-all duration-[2000ms] ease-in-out
              relative overflow-hidden
              ${fillPercentage > 70 ? 'shadow-[0_0_30px_rgba(59,130,246,0.6)]' : ''}
            `}
            style={{ height: `${fillPercentage}%` }}
          >

            {/* 🌊 REAL WAVE */}
            <div className="absolute top-0 left-0 w-[200%] h-4 bg-white/30 opacity-60 animate-wave blur-sm"></div>

            {/* 💧 FLOATING BUBBLES */}
            <div className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-white/50 rounded-full animate-float"></div>
            <div className="absolute bottom-6 right-4 w-2 h-2 bg-white/40 rounded-full animate-float delay-200"></div>
            <div className="absolute bottom-10 left-4 w-1 h-1 bg-white/60 rounded-full animate-float delay-500"></div>

          </div>

        </div>
      </div>

      {/* VALUE */}
      <div className="mt-6 text-center">
        <div className="flex items-baseline justify-center gap-1">
          <span className={`text-4xl font-black ${textColor}`}>
            {safeLevel.toFixed(1)}
          </span>
          <span className="text-sm font-bold text-slate-500">cm</span>
        </div>

        <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-widest">
          Current Water Level
        </p>
      </div>
    </div>
  );
}
