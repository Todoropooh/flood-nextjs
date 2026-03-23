'use client';

import React from 'react';
import { Clock } from 'lucide-react';

interface Log {
  _id?: string;
  level: number;
  status?: string;
  createdAt?: string;
  timestamp?: string;
  mac?: string;
  device_id?: string;
}

// 🌟 รับค่า devices เพิ่มเข้ามาเพื่อเอาระยะติดตั้งและเกณฑ์แจ้งเตือน
export default function RecentLogs({ logs, devices }: { logs: Log[], devices?: any[] }) {
  
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
        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
          {[...logs].reverse().map((log, index) => {
            
            // 🌟 1. ค้นหาข้อมูลอุปกรณ์เพื่อดึงค่า Install Height และเกณฑ์ต่างๆ
            const deviceMac = log.mac || log.device_id;
            const logDevice = devices?.find(d => d.mac === deviceMac);
            
            // ใช้ค่าจาก Admin ถ้าไม่มีให้ใช้ค่า Default 62.0
            const currentInstallHeight = logDevice?.installHeight ?? 62.0;
            const currentWarningThresh = logDevice?.warningThreshold ?? 5.0;
            const currentCriticalThresh = logDevice?.criticalThreshold ?? 10.0;

            // ✅ 2. คำนวณระดับน้ำ (V4.5 Dynamic Formula)
            const rawDist = Number(log.level) || currentInstallHeight;
            let waterLevel = (currentInstallHeight - rawDist);
            
            // ป้องกันค่า Noise และจำกัดช่วงข้อมูล
            if (rawDist <= 0.5 || rawDist > (currentInstallHeight + 10)) waterLevel = 0;
            if (waterLevel > 40) waterLevel = 40;
            if (waterLevel < 0) waterLevel = 0;

            // ✅ 3. ปรับสีตามเกณฑ์ของอุปกรณ์ตัวนั้นที่ตั้งค่าไว้
            let displayStatus = 'ปลอดภัย';
            let statusClasses = 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400';

            if (waterLevel >= currentCriticalThresh) { // 🔴 อันตราย
              displayStatus = 'อันตราย';
              statusClasses = 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400';
            } else if (waterLevel >= currentWarningThresh) { // 🟠 เฝ้าระวัง
              displayStatus = 'เฝ้าระวัง';
              statusClasses = 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400';
            }

            const timeString = new Date(log.createdAt || log.timestamp || Date.now()).toLocaleTimeString('th-TH', {
              hour: '2-digit', minute: '2-digit', second: '2-digit'
            });

            return (
              <tr key={log._id || index} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                <td className="px-4 py-4 font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {timeString}
                </td>
                <td className="px-4 py-4 font-black text-slate-700 dark:text-white text-base">
                  {waterLevel.toFixed(1)} <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold ml-0.5">cm</span>
                </td>
                <td className="px-4 py-4">
                  <span className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] border border-transparent group-hover:border-current transition-all ${statusClasses}`}>
                    {displayStatus}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {logs.length === 0 && (
        <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600">
             <Clock size={24} />
          </div>
          <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">ไม่มีข้อมูลบันทึกในขณะนี้</p>
        </div>
      )}
    </div>
  );
}