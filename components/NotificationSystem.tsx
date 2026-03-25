'use client';

import { useEffect, useRef } from 'react';
import { toast, Toaster } from 'react-hot-toast'; // สั่ง npm install react-hot-toast
import { AlertOctagon, Waves } from 'lucide-react';

export default function NotificationSystem({ logs, devices }: { logs: any[], devices: any[] }) {
  const lastNotifiedRef = useRef<Record<string, number>>({});

  useEffect(() => {
    // 1. ขออนุญาต Browser ส่งการแจ้งเตือน
    if (typeof window !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!logs || logs.length === 0) return;

    // ดึงค่าล่าสุดของแต่ละ Node มาเช็ค
    devices.forEach(device => {
      const deviceLogs = logs.filter(l => (l.mac || l.device_id) === device.mac);
      if (deviceLogs.length === 0) return;

      const latestLog = deviceLogs[deviceLogs.length - 1];
      const waterLevel = Number(latestLog.level || 0);
      const critThresh = device.criticalThreshold || 10;
      
      // ถ้าเกินค่าวิกฤต และยังไม่ได้เตือนใน 5 นาทีที่ผ่านมา (กันเตือนรัวๆ)
      const now = Date.now();
      const lastTime = lastNotifiedRef.current[device.mac] || 0;

      if (waterLevel >= critThresh && (now - lastTime > 5 * 60000)) {
        triggerNotification(device.name, waterLevel);
        lastNotifiedRef.current[device.mac] = now;
      }
    });
  }, [logs, devices]);

  const triggerNotification = (name: string, level: number) => {
    // 🔊 เสียงเตือน (ถ้ามีไฟล์เสียง)
    const audio = new Audio('/alert.mp3');
    audio.play().catch(() => {});

    // 🌟 1. แบบ In-App Toast (กระจกใส)
    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-red-500/80 dark:bg-red-600/90 backdrop-blur-xl shadow-2xl rounded-[1.5rem] pointer-events-auto flex ring-1 ring-black ring-opacity-5 border border-white/20 p-4 text-white`}>
        <div className="flex-1 w-0 p-1">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <AlertOctagon className="h-10 w-10 text-white animate-bounce" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Critical Alert!</p>
              <p className="text-sm font-black mt-1 uppercase tracking-tight">สถานี: {name}</p>
              <p className="text-xs font-bold opacity-90">ระดับน้ำวิกฤต: {level.toFixed(2)} cm</p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-white/20">
          <button onClick={() => toast.dismiss(t.id)} className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-xs font-black uppercase hover:bg-white/10 transition-all">Close</button>
        </div>
      </div>
    ), { duration: 10000 });

    // 🌟 2. แบบ Browser Notification (ถ้าอยู่นอกหน้าจอ)
    if (Notification.permission === 'granted') {
      new Notification(`🚨 ระดับน้ำวิกฤต: ${name}`, {
        body: `ระดับน้ำปัจจุบัน ${level.toFixed(2)} cm กรุณาตรวจสอบด่วน!`,
        icon: '/favicon.ico'
      });
    }
  };

  return <Toaster position="top-right" />;
}