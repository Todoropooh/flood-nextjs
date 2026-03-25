'use client';

import React from 'react';
import { Clock, MapPin } from 'lucide-react';

interface Log {
  _id?: string;
  level: number;
  status?: string;
  createdAt?: string;
  timestamp?: string;
  mac?: string;
  device_id?: string;
}

export default function RecentLogs({ logs, devices }: { logs: Log[], devices?: any[] }) {
  
  // ฟังก์ชันหาชื่ออุปกรณ์
  const getDeviceName = (mac: string) => {
    if (!devices) return mac;
    const dev = devices.find(d => d.mac === mac);
    return dev ? dev.name : mac;
  };

  return (
    <div className="overflow-y-auto h-full w-full scrollbar-hide">
      <table className="w-full text-sm text-left border-collapse">
        <thead className="text-[9px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest bg-white/40 dark:bg-black/40 sticky top-0 backdrop-blur-xl z-10 shadow-sm border-b border-white/50 dark:border-white/10">
          <tr>
            <th className="px-5 py-4">Time / Station</th>
            <th className="px-5 py-4 text-center">Water Level</th>
            <th className="px-5 py-4 text-right">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/30 dark:divide-white/5">
          {logs && logs.length > 0 && [...logs].reverse().map((log, index) => {
            
            // 🌟 1. ค้นหาข้อมูลอุปกรณ์รายตัว
            const deviceMac = log.mac || log.device_id || '';
            const logDevice = devices?.find(d => d.mac === deviceMac);
            const devName = getDeviceName(deviceMac);
            
            // 📏 ขีดจำกัดของอุปกรณ์แต่ละตัว (ใช้ fallback ถ้าหาไม่เจอ)
            const currentCriticalThresh = logDevice?.criticalThreshold ?? 10.0;
            const currentWarningThresh = logDevice?.warningThreshold ?? 5.0;

            // ✅ 2. คำนวณระดับน้ำ (โค้ดเก่าพี่มีการเอาระยะไปลบความสูง ซึ่งใน API ใหม่ของเรามันส่งค่า Level ตรงๆ มาแล้ว แต่ถ้าเผื่อไว้ ก็ใช้ค่าเดิมของ log.level ครับ)
            // ในระบบล่าสุดที่เราทำ API เราส่ง level มาเป็น "ระดับน้ำที่คำนวณแล้ว" ครับ เลยใช้ตรงๆ ได้เลย
            let waterLevel = Number(log.level || 0);

            // ✅ 3. เช็คสีสถานะ
            let displayStatus = 'STABLE';
            let statusClasses = 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';

            if (waterLevel >= currentCriticalThresh) { 
              displayStatus = 'CRITICAL';
              statusClasses = 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]';
            } else if (waterLevel >= currentWarningThresh) {
              displayStatus = 'WARNING';
              statusClasses = 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30';
            }

            // จัดฟอร์แมตเวลา
            const timeObj = new Date(log.createdAt || log.timestamp || Date.now());
            const timeString = timeObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const dateString = timeObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

            return (
              <tr key={log._id || index} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors group">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-800 dark:text-white uppercase drop-shadow-sm">
                    {timeString} <span className="text-[9px] text-slate-500 dark:text-slate-400">({dateString})</span>
                  </div>
                  {/* 🌟 [NEW] ป้ายชื่อสถานี เพื่อให้รู้ว่ามาจากเครื่องไหน */}
                  <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    <MapPin size={10} className="text-blue-500" /> {devName}
                  </div>
                </td>
                <td className="px-5 py-4 text-center">
                  <span className="text-lg font-black text-blue-600 dark:text-blue-400 tabular-nums drop-shadow-sm">
                    {waterLevel.toFixed(2)}
                  </span> 
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold ml-1">cm</span>
                </td>
                <td className="px-5 py-4 text-right">
                  <span className={`inline-block px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border backdrop-blur-md transition-all ${statusClasses}`}>
                    {displayStatus}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {(!logs || logs.length === 0) && (
        <div className="p-16 flex flex-col items-center justify-center gap-4 h-full">
          <div className="w-16 h-16 rounded-full bg-white/40 dark:bg-black/40 border border-white/50 dark:border-white/10 flex items-center justify-center text-slate-400 dark:text-slate-500 backdrop-blur-md shadow-inner">
             <Clock size={28} />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] drop-shadow-sm">No System Logs Found</p>
        </div>
      )}
    </div>
  );
}