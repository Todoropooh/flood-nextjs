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
  Waves, Sun, Moon, Activity, Thermometer, 
  Droplets, ChevronDown, Bell, AlertTriangle, 
  Map as MapIcon, Database, LayoutDashboard, Settings
} from 'lucide-react';

const DeviceMap = dynamic(() => import('@/components/DeviceMap'), { 
  ssr: false,
  loading: () => (
    <div className="h-[450px] w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-[2.5rem] flex items-center justify-center text-slate-400">
      กำลังโหลดแผนที่ระบบ...
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
  const [showPushNoti, setShowPushNoti] = useState(false);
  const [lastAlertState, setLastAlertState] = useState<'NONE' | 'SHOWN'>('NONE');

  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => { setIsMounted(true); }, []);

  const fetchData = useCallback(async () => {
    try {
      const t = Date.now();
      const [logRes, devRes] = await Promise.all([
        fetch(`/api/flood?timeframe=${timeframe}&t=${t}`),
        fetch(`/api/devices?t=${t}`)
      ]);
      if (logRes.ok && devRes.ok) {
        setLogs(await logRes.json());
        setDevices(await devRes.json());
      }
    } catch (err) { console.error(err); }
  }, [timeframe]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (!isMounted) return null;

  const checkOnline = (lastSeen: string) => {
    if (!lastSeen) return false;
    return (Date.now() - new Date(lastSeen).getTime()) < 60000;
  };

  const displayDevices = selectedDeviceMac === 'ALL' ? devices : devices.filter(d => d.mac === selectedDeviceMac);
  const displayLogs = selectedDeviceMac === 'ALL' ? logs : logs.filter(l => (l.mac || l.device_id) === selectedDeviceMac);
  const latestLog = displayLogs.length > 0 ? displayLogs[displayLogs.length - 1] : null;
  const currentDevice = displayDevices.length > 0 ? displayDevices[0] : null;

  // Logic 95-20 (ปรับให้ตรงกับหน้างานจริงที่พี่แก้ไปล่าสุด)
  const sensorDist = Number(latestLog?.level ?? 95);
  let waterInTank = 95 - sensorDist;
  if (sensorDist <= 0.5 || sensorDist > 85) waterInTank = 0;
  if (waterInTank > 20) waterInTank = 20;
  if (waterInTank < 0) waterInTank = 0;

  const getStatusInfo = (w: number) => {
    if (w > 14) return { label: "วิกฤต (Critical)", color: "text-red-500", bg: "bg-red-500", border: "border-red-500/50" };
    if (w > 7) return { label: "เฝ้าระวัง (Warning)", color: "text-orange-500", bg: "bg-orange-500", border: "border-orange-500/50" };
    return { label: "ปกติ (Stable)", color: "text-emerald-500", bg: "bg-emerald-500", border: "border-emerald-500/50" };
  };

  const status = getStatusInfo(waterInTank);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] transition-colors duration-500">
      
      {/* Background Glow Effects */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-[100] w-full bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 group">
              <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl text-white shadow-lg shadow-blue-500/20 group-hover:rotate-12 transition-transform">
                <Waves size={24}/>
              </div>
              <h1 className="text-lg font-black tracking-tighter hidden md:block">
                FLOOD<span className="text-blue-600">PRO</span> <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full ml-1">V3.5</span>
              </h1>
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden md:block" />

            <div className="relative">
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-all text-sm font-bold"
              >
                <div className={`w-2 h-2 rounded-full ${selectedDeviceMac === 'ALL' ? 'bg-blue-500' : 'bg-emerald-500'} animate-pulse`} />
                {selectedDeviceMac === 'ALL' ? 'All Stations' : currentDevice?.name}
                <ChevronDown size={14} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-3 w-72 bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl rounded-[2rem] border border-slate-200 dark:border-slate-800 p-3 animate-in fade-in slide-in-from-top-2">
                  <button onClick={() => { setSelectedDeviceMac('ALL'); setIsDropdownOpen(false); }} className="w-full text-left px-5 py-3 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-2xl text-xs font-black uppercase transition-colors mb-1">🌍 Global Overview</button>
                  {devices.map((d: any) => (
                    <button key={d.mac} onClick={() => { setSelectedDeviceMac(d.mac); setIsDropdownOpen(false); }} className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl text-xs font-bold transition-all">
                      <span>📍 {d.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${checkOnline(d.updatedAt) ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>
                        {checkOnline(d.updatedAt) ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:scale-105 active:scale-95 transition-all text-slate-500">
              {resolvedTheme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}
            </button>
            <Link href="/admin" className="hidden sm:flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white dark:text-black text-white rounded-2xl text-xs font-black uppercase shadow-xl hover:shadow-blue-500/20 transition-all active:scale-95">
              <Settings size={14} /> Admin Panel
            </Link>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="max-w-[1600px] mx-auto p-6 space-y-8">
        
        {/* Real-time Metrics Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <LayoutDashboard size={18} className="text-blue-600" />
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Live Telemetry</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard label="Water Level" val={waterInTank.toFixed(1)} unit="cm" icon={<Waves/>} color={status.color} />
            <MetricCard label="Temperature" val={Number(latestLog?.temperature ?? 0).toFixed(1)} unit="°C" icon={<Thermometer/>} color="text-orange-500" />
            <MetricCard label="Humidity" val={Number(latestLog?.humidity ?? latestLog?.air_humidity ?? 0).toFixed(0)} unit="%" icon={<Droplets/>} color="text-cyan-500" />
            <div className={`bg-white dark:bg-slate-900 p-6 rounded-[2rem] border-2 shadow-xl flex flex-col justify-between h-44 ${status.border}`}>
               <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Safety Status</span>
                  <div className={`p-2.5 rounded-2xl ${status.bg} text-white shadow-lg`}><Activity size={20}/></div>
               </div>
               <div className={`text-2xl font-black ${status.color} animate-pulse`}>{status.label}</div>
            </div>
          </div>
        </section>

        {/* Analytics & Tank Visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col min-h-[550px]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h3 className="text-xl font-black tracking-tight">Analytics Dashboard</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Water level trend & environmental data</p>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl">
                {['day', 'week', 'month'].map(tf => (
                  <button key={tf} onClick={() => setTimeframe(tf)} className={`px-6 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${timeframe === tf ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-lg scale-105' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}>{tf}</button>
                ))}
              </div>
            </div>
            <div className="flex-grow">
              <WaterLevelChart data={displayLogs} timeframe={timeframe} isDark={resolvedTheme === 'dark'} devices={devices} selectedDeviceMac={selectedDeviceMac} />
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-8">
            <WaterTank level={waterInTank} />
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform"><Database size={120} /></div>
               <h3 className="text-sm font-black uppercase tracking-widest opacity-80 mb-2">System Insights</h3>
               <p className="text-3xl font-black leading-tight mb-4">สถานะการเก็บข้อมูล <br/>เป็นปกติ</p>
               <div className="flex items-center gap-2 bg-white/20 w-fit px-4 py-2 rounded-full backdrop-blur-md">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                  <span className="text-[10px] font-bold uppercase tracking-tighter">Database Connected</span>
               </div>
            </div>
          </div>
        </div>

        {/* Map & Logs Section */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-7 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl"><MapIcon size={20}/></div>
                <h3 className="text-lg font-black">Live Geospatial View</h3>
              </div>
            </div>
            <div className="flex-grow p-4 min-h-[450px]">
              <div className="h-full w-full rounded-[2.5rem] overflow-hidden border-4 border-slate-50 dark:border-slate-800 shadow-inner">
                <DeviceMap devices={displayDevices} />
              </div>
            </div>
          </div>

          <div className="xl:col-span-5 flex flex-col gap-8">
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex-grow flex flex-col">
               <div className="p-8 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-lg font-black flex items-center gap-3">
                    <Database size={20} className="text-indigo-500" /> Recent Activity
                  </h3>
               </div>
               <div className="flex-grow overflow-y-auto max-h-[400px]">
                  <RecentLogs logs={displayLogs} />
               </div>
            </div>
            
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm min-h-[300px]">
               <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6">Level Distribution</h3>
               <div className="h-[200px] flex items-center justify-center">
                  <StatusDonut logs={displayLogs} isDark={resolvedTheme === 'dark'} />
               </div>
            </div>
          </div>
        </div>
      </main>

      {/* Admin Nav Mobile */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 md:hidden z-[150]">
        <Link href="/admin" className="flex items-center gap-2 px-8 py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-full shadow-2xl font-black text-xs uppercase tracking-widest active:scale-90 transition-transform">
           Admin Console
        </Link>
      </div>
    </div>
  );
}

function MetricCard({ label, val, unit, icon, color }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800 shadow-sm flex flex-col justify-between h-44 group hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-300">
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
        <div className={`p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 group-hover:scale-110 transition-transform ${color}`}>{icon}</div>
      </div>
      <div>
        <span className={`text-4xl font-black ${color} tracking-tighter`}>{val}</span>
        <span className="text-xs font-bold text-slate-400 ml-2 uppercase tracking-tighter">{unit}</span>
      </div>
    </div>
  );
}