'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import dynamicImport from 'next/dynamic';

// ✅ ดึง Component มาใช้ครบทุกตัว
import WaterLevelChart from '@/components/WaterLevelChart';
import StatusDonut from '@/components/StatusDonut';
import WaterTank from '@/components/WaterTank'; 
import RecentLogs from '@/components/RecentLogs'; 

import { 
  Waves, Settings, Sun, Moon, Activity, Thermometer, 
  Droplets, ChevronDown, Bell, AlertTriangle 
} from 'lucide-react';

// ✅ แผนที่แบบ No SSR (ป้องกัน Error หน้าขาว)
const DeviceMap = dynamicImport(() => import('@/components/DeviceMap'), { 
  ssr: false,
  loading: () => (
    <div className="h-[450px] w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-[2rem] flex items-center justify-center text-slate-400">
      กำลังโหลดแผนที่...
    </div>
  )
});

export const dynamic = 'force-dynamic';

export default function Home() {
  const [logs, setLogs] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDeviceMac, setSelectedDeviceMac] = useState<string>('ALL');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [timeframe, setTimeframe] = useState('day');
  const [isLoading, setIsLoading] = useState(false);
  const [showPushNoti, setShowPushNoti] = useState(true);

  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchData = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (!isMounted) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950" />;

  const normalize = (v: any) => String(v || '').trim().toLowerCase();

  const displayDevices = selectedDeviceMac === 'ALL'
      ? devices
      : devices.filter(d => normalize(d.mac) === normalize(selectedDeviceMac));

  const displayLogs = selectedDeviceMac === 'ALL'
      ? logs
      : logs.filter(l => normalize(l.mac || l.device_id) === normalize(selectedDeviceMac));

  const latestLog = displayLogs.length > 0 ? displayLogs[displayLogs.length - 1] : null;
  const currentDevice = displayDevices.length > 0 ? displayDevices[0] : null;

  // ✅ 1. Logic ระดับน้ำ (0-20 cm)
  const sensorDist = Number(latestLog?.level ?? currentDevice?.waterLevel ?? 70);
  let waterInTank = 70 - sensorDist;
  if (waterInTank > 20) waterInTank = 20;
  if (waterInTank < 0) waterInTank = 0;

  // ✅ 2. อุณหภูมิและความชื้น
  const currentTemp = Number(latestLog?.temperature ?? currentDevice?.temperature ?? 0);
  const currentHumid = Number(latestLog?.humidity ?? latestLog?.air_humidity ?? currentDevice?.humidity ?? 0);

  // ✅ 3. เช็คสถานะ (เตือน 10 / วิกฤต 17)
  const getStatusInfo = (water: number) => {
    if (water >= 17) return { label: "🔴 วิกฤต: น้ำเต็มถัง", color: "text-red-500", bg: "bg-red-500" };
    if (water >= 10) return { label: "🟠 เตือน: น้ำครึ่งถัง", color: "text-orange-500", bg: "bg-orange-500" };
    return { label: "🟢 ปกติ: ปริมาณน้ำต่ำ", color: "text-emerald-500", bg: "bg-emerald-500" };
  };

  const status = getStatusInfo(waterInTank);

  // กลับมาแสดง Pop-up เมื่อถึงระดับเตือน
  useEffect(() => {
    if (waterInTank >= 10) setShowPushNoti(true);
  }, [waterInTank]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 relative">

      {/* ✅ PUSH NOTIFICATION POP-UP */}
      {showPushNoti && waterInTank >= 10 && (
        <div className="fixed bottom-8 right-8 z-[200] animate-bounce shadow-2xl">
          <div className={`p-4 rounded-2xl flex items-center gap-4 text-white shadow-xl border-2 border-white/20 ${status.bg}`}>
            <AlertTriangle size={32} className="animate-pulse" />
            <div className="pr-6">
              <h4 className="font-bold text-lg leading-tight">{waterInTank >= 17 ? 'วิกฤต!' : 'เตือนภัย!'}</h4>
              <p className="text-sm opacity-90">ระดับน้ำปัจจุบัน {waterInTank.toFixed(1)} cm</p>
            </div>
            <button onClick={() => setShowPushNoti(false)} className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full">✕</button>
          </div>
        </div>
      )}

      {/* ✅ HEADER */}
      <header className="sticky top-0 z-[100] w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg"><Waves size={24}/></div>
            <div className="relative">
              <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 font-bold text-sm uppercase transition-all">
                {selectedDeviceMac === 'ALL' ? '🌍 Overview' : `📍 ${currentDevice?.name || 'Device'}`}
                <ChevronDown size={16} />
              </button>
              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-900 shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-800 z-50 p-2">
                  <button onClick={() => { setSelectedDeviceMac('ALL'); setIsDropdownOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-bold uppercase transition-colors">🌍 Overview</button>
                  {devices.map((d: any) => (
                    <button key={d.mac} onClick={() => { setSelectedDeviceMac(d.mac); setIsDropdownOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-bold uppercase transition-colors">📍 {d.name}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* ✅ กระดิ่งแจ้งเตือน */}
            <button className="relative p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <Bell size={20} className="text-slate-600 dark:text-slate-300" />
              {waterInTank >= 10 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${waterInTank >= 17 ? 'bg-red-400' : 'bg-orange-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 border-2 border-white dark:border-slate-900 ${waterInTank >= 17 ? 'bg-red-500' : 'bg-orange-500'}`}></span>
                </span>
              )}
            </button>

            <button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              {resolvedTheme === 'dark' ? <Sun size={20} className="text-yellow-500"/> : <Moon size={20} className="text-blue-600"/>}
            </button>
            <Link href="/admin" className="px-4 py-2 bg-slate-900 dark:bg-blue-600 text-white rounded-xl text-xs font-bold uppercase shadow-lg">Admin</Link>
          </div>
        </div>
      </header>

      {/* ✅ MAIN CONTENT */}
      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        
        {/* TOP METRICS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Water Level" val={waterInTank.toFixed(1)} unit="cm" icon={<Waves/>} color={status.color} />
          <MetricCard label="Temperature" val={currentTemp.toFixed(1)} unit="°C" icon={<Thermometer/>} color="text-orange-500" />
          <MetricCard label="Humidity" val={currentHumid.toFixed(0)} unit="%" icon={<Droplets/>} color="text-emerald-500" />
          <MetricCard label="Current Status" val={status.label} unit="" icon={<Activity/>} color={status.color} />
        </div>

        {/* HERO SECTION: TRENDS & TANK */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm min-h-[450px] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2"><Activity size={18} className="text-blue-600"/> Trend Analytics</h3>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {['day', 'week', 'month'].map(tf => (
                  <button key={tf} onClick={() => setTimeframe(tf)} className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all ${timeframe === tf ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-slate-500'}`}>{tf}</button>
                ))}
              </div>
            </div>
            <div className="flex-grow">
              <WaterLevelChart data={displayLogs} timeframe={timeframe} isDark={resolvedTheme === 'dark'} devices={devices} selectedDeviceMac={selectedDeviceMac} />
            </div>
          </div>

          {/* ✅ เรียกใช้ WaterTank ที่เราเพิ่งสร้าง */}
          <WaterTank level={waterInTank} />
        </div>

        {/* BOTTOM SECTION: TABLE & DONUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <RecentLogs logs={displayLogs} />
          </div>

          <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center">
            <h3 className="text-xs font-black uppercase tracking-widest mb-4 self-start">Status Distribution</h3>
            <div className="w-full h-[300px]">
              <StatusDonut logs={displayLogs} isDark={resolvedTheme === 'dark'} />
            </div>
          </div>
        </div>

        {/* MAP SECTION */}
        <div className="bg-white dark:bg-slate-900 p-2 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="h-[450px] w-full rounded-[2rem] overflow-hidden">
            <DeviceMap devices={displayDevices} />
          </div>
        </div>
      </main>
    </div>
  );
}

// ✅ Internal MetricCard เพื่อความรวดเร็วในการ Render
function MetricCard({ label, val, unit, icon, color }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-40 transition-all hover:translate-y-[-4px]">
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
        <div className={`p-2 rounded-xl bg-slate-50 dark:bg-slate-800 ${color}`}>{icon}</div>
      </div>
      <div>
        <span className={`text-3xl font-black ${color} break-words leading-tight`}>{val}</span>
        <span className="text-xs font-bold text-slate-400 ml-1">{unit}</span>
      </div>
    </div>
  );
}