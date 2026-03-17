'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// --- Import Components ---
import WaterLevelChart from '@/components/WaterLevelChart';
import StatusDonut from '@/components/StatusDonut';
import WaterTank from '@/components/WaterTank'; 
import RecentLogs from '@/components/RecentLogs'; 

import { 
  Waves, Settings, Sun, Moon, Activity, Thermometer, 
  Droplets, ChevronDown, Bell, AlertTriangle 
} from 'lucide-react';

// --- แผนที่แบบ No SSR ---
const DeviceMap = dynamic(() => import('@/components/DeviceMap'), { 
  ssr: false,
  loading: () => (
    <div className="h-[450px] w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-[2rem] flex items-center justify-center text-slate-400">
      กำลังโหลดแผนที่...
    </div>
  )
});

export default function Home() {
  const [logs, setLogs] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDeviceMac, setSelectedDeviceMac] = useState<string>('ALL');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [timeframe, setTimeframe] = useState('day');
  
  // ระบบแจ้งเตือน
  const [showPushNoti, setShowPushNoti] = useState(false);
  const [lastAlertState, setLastAlertState] = useState<'NONE' | 'SHOWN'>('NONE');

  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const t = Date.now();
      const [logRes, devRes] = await Promise.all([
        fetch(`/api/flood?timeframe=${timeframe}&t=${t}`),
        fetch(`/api/devices?t=${t}`)
      ]);

      if (logRes.ok && devRes.ok) {
        const logData = await logRes.json();
        const devData = await devRes.json();
        setLogs(Array.isArray(logData) ? logData : []);
        setDevices(Array.isArray(devData) ? devData : []);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (!isMounted) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950" />;

  // --- ระบบ Filter ข้อมูล ---
  const normalize = (v: any) => String(v || '').trim().toLowerCase();
  
  const displayDevices = selectedDeviceMac === 'ALL'
      ? devices
      : devices.filter(d => normalize(d.mac) === normalize(selectedDeviceMac));

  const displayLogs = selectedDeviceMac === 'ALL'
      ? logs
      : logs.filter(l => normalize(l.mac || l.device_id) === normalize(selectedDeviceMac));

  const latestLog = displayLogs.length > 0 ? displayLogs[displayLogs.length - 1] : null;
  const currentDevice = displayDevices.length > 0 ? displayDevices[0] : null;

  // ✅ [LOGIC 70-20]
  const sensorHeight = 70;
  const tankMaxHeight = 20;
  const sensorDist = Number(latestLog?.level ?? currentDevice?.waterLevel ?? 70);
  
  // สูตรคำนวณระดับน้ำ
  let waterInTank = sensorHeight - sensorDist;

  // 🛡️ Zero-Point Fix
  if (sensorDist <= 0.5 || sensorDist > 63) {
    waterInTank = 0;
  }

  if (waterInTank > tankMaxHeight) waterInTank = tankMaxHeight;
  if (waterInTank < 0) waterInTank = 0;

  // ✅ แก้ไข Syntax Error บรรทัด 106-107 (ใช้ ?? อย่างเดียวเพื่อให้ Build ผ่าน)
  const currentTemp = Number(latestLog?.temperature ?? currentDevice?.temperature ?? 0);
  const currentHumid = Number(latestLog?.humidity ?? latestLog?.air_humidity ?? currentDevice?.humidity ?? 0);

  // การจัดการแจ้งเตือน Pop-up
  if (waterInTank > 7 && lastAlertState === 'NONE') {
    setShowPushNoti(true);
    setLastAlertState('SHOWN');
  } else if (waterInTank <= 7 && lastAlertState === 'SHOWN') {
    setShowPushNoti(false);
    setLastAlertState('NONE');
  }

  // เกณฑ์แจ้งเตือน 7 / 14 / 20
  const getStatusInfo = (w: number) => {
    if (w > 14) return { label: "🔴 อันตราย", color: "text-red-500", bg: "bg-red-500" };
    if (w > 7) return { label: "🟡 เฝ้าระวัง", color: "text-orange-500", bg: "bg-orange-500" };
    return { label: "🟢 ปลอดภัย", color: "text-emerald-500", bg: "bg-emerald-500" };
  };

  const status = getStatusInfo(waterInTank);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 relative transition-colors">
      
      {showPushNoti && waterInTank > 7 && (
        <div className="fixed bottom-8 right-8 z-[200] animate-bounce">
          <div className={`p-4 rounded-2xl flex items-center gap-4 text-white shadow-2xl border-2 border-white/20 ${status.bg}`}>
            <AlertTriangle size={32} className="animate-pulse" />
            <div className="pr-6">
              <h4 className="font-bold text-lg leading-tight">{waterInTank > 14 ? '🚨 อันตราย!' : '⚠️ เฝ้าระวัง'}</h4>
              <p className="text-sm opacity-90">ระดับน้ำปัจจุบัน {waterInTank.toFixed(1)} cm</p>
            </div>
            <button onClick={() => setShowPushNoti(false)} className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full transition-colors">✕</button>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-[100] w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg"><Waves size={24}/></div>
            <div className="relative">
              <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 font-bold text-sm uppercase transition-all active:scale-95">
                {selectedDeviceMac === 'ALL' ? '🌍 Overview' : `📍 Device`}
                <ChevronDown size={16} />
              </button>
              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-900 shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-800 z-50 p-2 overflow-hidden">
                  <button onClick={() => { setSelectedDeviceMac('ALL'); setIsDropdownOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-bold uppercase transition-colors">🌍 Overview</button>
                  {devices.map((d: any) => (
                    <button key={d.mac} onClick={() => { setSelectedDeviceMac(d.mac); setIsDropdownOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-bold uppercase transition-colors">📍 {d.name || d.mac}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:scale-110 active:scale-90">
              {resolvedTheme === 'dark' ? <Sun size={20} className="text-yellow-500"/> : <Moon size={20} className="text-blue-600"/>}
            </button>
            <Link href="/admin" className="px-4 py-2 bg-slate-900 dark:bg-blue-600 text-white rounded-xl text-xs font-bold uppercase shadow-lg">Admin</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="ระดับน้ำ" val={waterInTank.toFixed(1)} unit="cm" icon={<Waves/>} color={status.color} />
          <MetricCard label="อุณหภูมิ" val={currentTemp.toFixed(1)} unit="°C" icon={<Thermometer/>} color="text-orange-500" />
          <MetricCard label="ความชื้น" val={currentHumid.toFixed(0)} unit="%" icon={<Droplets/>} color="text-emerald-500" />
          <MetricCard label="สถานะ" val={status.label} unit="" icon={<Activity/>} color={status.color} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm min-h-[450px] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2"><Activity size={18} className="text-blue-600"/> Trend Analytics</h3>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-inner text-xs font-bold">
                {['day', 'week', 'month'].map(tf => (
                  <button key={tf} onClick={() => setTimeframe(tf)} className={`px-4 py-1 uppercase rounded-lg transition-all ${timeframe === tf ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500'}`}>{tf}</button>
                ))}
              </div>
            </div>
            <div className="flex-grow">
              <WaterLevelChart 
                data={displayLogs} 
                timeframe={timeframe} 
                isDark={resolvedTheme === 'dark'} 
                devices={devices} 
                selectedDeviceMac={selectedDeviceMac} 
              />
            </div>
          </div>
          <WaterTank level={waterInTank} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden text-slate-800 dark:text-slate-100">
            <RecentLogs logs={displayLogs} />
          </div>
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center min-h-[350px]">
            <h3 className="text-xs font-black uppercase tracking-widest mb-4 self-start">Distribution</h3>
            <div className="w-full h-full flex items-center justify-center">
              <StatusDonut logs={displayLogs} isDark={resolvedTheme === 'dark'} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-2 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="h-[450px] w-full rounded-[2rem] overflow-hidden">
            <DeviceMap devices={displayDevices} />
          </div>
        </div>
      </main>
    </div>
  );
}

function MetricCard({ label, val, unit, icon, color }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-40 transition-all hover:translate-y-[-4px]">
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
        <div className={`p-2 rounded-xl bg-slate-50 dark:bg-slate-800 ${color}`}>{icon}</div>
      </div>
      <div>
        <span className={`text-3xl font-black ${color} leading-tight`}>{val}</span>
        <span className="text-xs font-bold text-slate-400 ml-1">{unit}</span>
      </div>
    </div>
  );
}