'use client';

import React from 'react';

interface Log {
  _id?: string;
  level: number;
  status?: string;
  createdAt?: string;
  timestamp?: string;
}

export default function RecentLogs({ logs }: { logs: Log[] }) {
  return (
    <div className="overflow-y-auto h-full w-full">
      <table className="w-full text-sm text-left">
        <thead className="text-[10px] text-slate-400 dark:text-slate-500 uppercase bg-slate-50/90 dark:bg-slate-800/90 sticky top-0 backdrop-blur-md z-10 shadow-sm">
          <tr>
            <th className="px-4 py-3 font-black tracking-wider">เวลา</th>
            <th className="px-4 py-3 font-black tracking-wider">ระดับน้ำ</th>
            <th className="px-4 py-3 font-black tracking-wider">สถานะ</th>
          </tr>
        </thead>
        <tbody>
          {[...logs].reverse().map((log, index) => {
            
            // ✅ 1. คำนวณระดับน้ำ (สูตรเดียวกับหน้าหลักเป๊ะ)
            const rawDist = Number(log.level) || 84.0;
            let waterLevel = (84.0 - rawDist) - 5.0;
            
            // ป้องกันค่าแกว่งและจำกัดความสูงถังที่ 40 ซม.
            if (rawDist <= 0.5 || rawDist > 90) waterLevel = 0;
            if (waterLevel > 40) waterLevel = 40;
            if (waterLevel < 0) waterLevel = 0;

            // ✅ 2. กำหนดเกณฑ์แจ้งเตือนใหม่ (แดง >= 20, ส้ม >= 10)
            let displayStatus = 'ปลอดภัย';
            let statusClasses = 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400';

            if (waterLevel >= 20.0) {
              displayStatus = 'อันตราย';
              statusClasses = 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400';
            } else if (waterLevel >= 10.0) {
              displayStatus = 'เฝ้าระวัง';
              statusClasses = 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400';
            }

            // รองรับทั้งฟิลด์ timestamp และ createdAt
            const timeString = new Date(log.timestamp || log.createdAt || Date.now()).toLocaleTimeString('th-TH');

            return (
              <tr key={log._id || index} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                <td className="px-4 py-3 font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {timeString}
                </td>
                
                <td className="px-4 py-3 font-black text-slate-700 dark:text-slate-200">
                  {waterLevel.toFixed(1)} <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold ml-0.5">cm</span>
                </td>
                
                <td className="px-4 py-3">
                  <span className={`px-2 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider ${statusClasses}`}>
                    {displayStatus}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {logs.length === 0 && (
        <div className="p-10 text-center text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider">
          ไม่มีข้อมูลบันทึกในขณะนี้
        </div>
      )}
    </div>
  );
}