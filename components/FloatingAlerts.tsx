// components/FloatingAlerts.tsx
'use client';

import { useState, useEffect } from 'react';
// 🟢 เพิ่ม Clock เข้ามาตรงนี้ครับ
import { Bell, X, AlertTriangle, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export default function FloatingAlerts({ alerts }: { alerts: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(alerts.length);

  // อัปเดตตัวเลขแจ้งเตือน (ล้างค่าเมื่อกดเปิด)
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    } else {
      setUnreadCount(alerts.length);
    }
  }, [isOpen, alerts.length]);

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      
      {/* --- Popup Panel (กระจกเบลอ + Animation เปิด/ปิด) --- */}
      <div 
        className={`
          mb-4 w-[calc(100vw-3rem)] sm:w-96 
          bg-white/70 dark:bg-[#1C1C1E]/70 backdrop-blur-3xl 
          border border-white/50 dark:border-white/10 
          shadow-[0_20px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)]
          rounded-[2rem] overflow-hidden origin-bottom-right
          transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
          ${isOpen 
            ? 'opacity-100 scale-100 translate-y-0 visible' 
            : 'opacity-0 scale-90 translate-y-10 invisible pointer-events-none'
          }
        `}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center bg-white/50 dark:bg-black/20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-500 dark:text-blue-400 rounded-full">
              <Bell size={16} />
            </div>
            <h3 className="text-sm font-bold tracking-tight text-slate-800 dark:text-white">Notifications</h3>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 rounded-full transition-all"
          >
            <X size={16} />
          </button>
        </div>
        
        {/* Alerts List */}
        <div className="max-h-[350px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
          {alerts.length === 0 ? (
            <div className="p-10 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center gap-3">
              <CheckCircle2 size={36} className="opacity-30" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]">All Clear</p>
            </div>
          ) : (
            <div className="space-y-2 p-2">
              {alerts.map((alert, i) => (
                <div 
                  key={i} 
                  className="p-4 rounded-[1.5rem] bg-white/60 dark:bg-black/20 border border-white/50 dark:border-white/5 hover:bg-white dark:hover:bg-black/40 transition-colors flex gap-4 shadow-sm"
                >
                  <div className="mt-1">
                    {alert.status === 'Critical' ? (
                      <div className="p-2 bg-red-500/10 rounded-full"><AlertTriangle size={18} className="text-red-500" /></div>
                    ) : (
                      <div className="p-2 bg-amber-500/10 rounded-full"><AlertCircle size={18} className="text-amber-500" /></div>
                    )}
                  </div>
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${alert.status === 'Critical' ? 'text-red-500' : 'text-amber-500'}`}>
                      {alert.status} ALERT
                    </p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-tight">
                      ตรวจพบระดับน้ำผิดปกติ: {alert.level} cm
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-2 flex items-center gap-1">
                      {/* ตอนนี้มี Clock แล้ว ไม่ Error แน่นอนครับ */}
                      <Clock size={10} /> {new Date(alert.createdAt).toLocaleString('th-TH')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- Floating Button (ปุ่มกระดิ่งมุมขวาล่าง) --- */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`
          group relative p-4 
          bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl 
          border border-white/50 dark:border-white/10 
          shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)]
          rounded-full transition-all duration-300
          ${isOpen ? 'scale-90 bg-slate-100 dark:bg-[#2C2C2E]' : 'hover:scale-105 active:scale-95'}
        `}
      >
        <Bell 
          size={24} 
          className={`transition-all duration-500 ${isOpen ? 'text-blue-500 rotate-12' : 'text-slate-700 dark:text-slate-200 group-hover:rotate-12'}`} 
        />
        
        {/* จุดแจ้งเตือนสีแดง (Red Badge) */}
        {unreadCount > 0 && !isOpen && (
          <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 border-[3px] border-white dark:border-[#1C1C1E] text-[10px] font-black text-white shadow-sm animate-in zoom-in duration-300">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

    </div>
  );
}