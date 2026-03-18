'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import WaterLevelChart from '@/components/WaterLevelChart';
import WaterTank from '@/components/WaterTank'; 
import RecentLogs from '@/components/RecentLogs'; 
import { 
  Waves, Sun, Activity, Thermometer, Droplets, ChevronDown, Settings, 
  Radio, Server, CheckCircle2, ShieldAlert, AlertTriangle, TrendingUp, 
  Database, Clock, Signal, FileText, ActivitySquare, Zap
} from 'lucide-react';

const DeviceMap = dynamic(() => import('@/components/DeviceMap'), { 
  ssr: false,
  loading: () => <div className="h-[450px] w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-[2.5rem]" />
});

export default function Home() {
  const [logs, setLogs] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDeviceMac, setSelectedDeviceMac] = useState<string>('ALL');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [timeframe, setTimeframe] = useState('day');
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
    } catch (err) { console.error("Fetch error:", err); }
  }, [timeframe]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // 🌟 สูตร Calibrate 62.0 (ระยะพื้นจริงของพี่)
  const calculateWater = useCallback((level: any) => {
    const raw = Number(level ?? 62.0); 
    let val = (62.0 - raw); 
    if (raw <= 0.5 || raw > 75) val = 0; // กรอง Noise
    return val < 0 ? 0 : (val > 40 ? 40 : val); 
  }, []);

  const activeLogs = useMemo(() => {
    if (!logs || logs.length === 0) return [];
    return selectedDeviceMac === 'ALL' ? logs : logs.filter(l => (l.mac || l.device_id) === selectedDeviceMac);
  }, [logs, selectedDeviceMac]);

  const waterInTank = useMemo(() => {
    if (activeLogs.length === 0) return 0;
    return calculateWater(activeLogs[activeLogs.length - 1].level);
  }, [activeLogs, calculateWater]);

  const status = waterInTank >= 10 ? { label: "CRITICAL", color: "text-red-500", bg: "bg-red-500", icon: <ShieldAlert size={24}/>, border: "border-red-500", glow: "shadow-red-500/20" }
               : waterInTank >= 5 ? { label: "WARNING", color: "text-orange-500", bg: "bg-orange-500", icon: <AlertTriangle size={24}/>, border: "border-orange-500", glow: "shadow-orange-500/20" }
               : { label: "STABLE", color: "text-emerald-500", bg: "bg-emerald-500", icon: <CheckCircle2 size={24}/>, border: "border-emerald-500", glow: "shadow-emerald-500/20" };

  const insights = useMemo(() => {
    if (!activeLogs.length) return { maxWater: 0, avgSignal: 0, rateOfChange: 0, timeToFlood: null, lastUpdate: 'N/A' };
    
    const latestLog = activeLogs[activeLogs.length - 1];
    const allWater = activeLogs.map(l => calculateWater(l.level));
    const latestTime = new Date(latestLog.createdAt || Date.now()).getTime();
    const oldLog = activeLogs.find(l => new Date(l.createdAt).getTime() >= latestTime - 3600000) || activeLogs[0];
    const hourDiff = (latestTime - new Date(oldLog.createdAt).getTime()) / 3600000;
    const rate = hourDiff > 0 ? (calculateWater(latestLog.level) - calculateWater(oldLog.level)) / hourDiff : 0;

    let timeStr = null;
    if (rate > 0 && waterInTank < 10) {
      const mins = Math.round(((10 - waterInTank) / rate) * 60);
      timeStr = mins > 0 ? `${mins} นาที` : "เร็วๆ นี้";
    }

    return { 
      maxWater: Math.max(...allWater), 
      avgSignal: latestLog?.signal || 0, 
      rateOfChange: rate, 
      timeToFlood: timeStr,
      lastUpdate: latestLog?.createdAt ? new Date(latestLog.createdAt).toLocaleTimeString('th-TH') : 'N/A'
    };
  }, [activeLogs, calculateWater, waterInTank]);

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#020617] transition-all duration-500 font-sans pb-10">
      <header className="sticky top-0 z-[100] bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-8 py-4 print:hidden">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white shadow-lg shadow-blue-500/30"><Waves size={24}/></div>
            <div className="relative">
              <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest border border-slate-200 dark:border-slate-800 transition-all hover:bg-slate-200">
                <Server size={16} className="text-blue-500" />
                {selectedDeviceMac === 'ALL' ? 'System Overview' : devices.find(d => d.mac === selectedDeviceMac)?.name || 'Device'}
                <ChevronDown size={16} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-3 w-64 bg-white dark:bg-slate-900 shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-800 p-2 z-[110]">
                  <button onClick={() => { setSelectedDeviceMac('ALL'); setIsDropdownOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl text-xs font-bold uppercase transition-all">🌍 All Devices</button>
                  {devices.map((d: any) => (
                    <button key={d.mac} onClick={() => { setSelectedDeviceMac(d.mac); setIsDropdownOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold uppercase transition-all">
                      <Radio size={14} className="text-slate-400" /> {d.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500"><Sun size={20}/></button>
             <Link href="/admin" className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500"><Settings size={20} /></Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className={`lg:col-span-4 p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 ${status.border} ${status.glow} shadow-2xl flex flex-col justify-between relative overflow-hidden group`}>
             <div className="relative z-10">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Live Status</span>
                <div className={`text-5xl font-black mt-2 ${status.color} tracking-tighter`}>{status.label}</div>
             </div>
             <div className="mt-8 relative z-10 flex items-end justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-500 uppercase">Current Water</div>
                  <div className="text-6xl font-black text-slate-800 dark:text-white tabular-nums">{waterInTank.toFixed(1)}<span className="text-xl ml-2 text-slate-400">cm</span></div>
                </div>
                <div className={`p-4 rounded-3xl ${status.bg} text-white shadow-xl animate-bounce`}>{status.icon}</div>
             </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
             <StatCard icon={<TrendingUp />} label="Highest" value={insights.maxWater.toFixed(1)} unit="cm" color="blue" />
             <StatCard icon={<ActivitySquare />} label="Rate" value={(insights.rateOfChange > 0 ? "+" : "") + insights.rateOfChange.toFixed(1)} unit="cm/h" color="orange" />
             <StatCard icon={<Zap />} label="Prediction" value={insights.timeToFlood || "Stable"} unit="" color="pink" />
             <StatCard icon={<Signal />} label="Signal" value={insights.avgSignal === 99 ? 0 : insights.avgSignal} unit="CSQ" color="indigo" />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-8 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl min-h-[500px]">
             <div className="h-[420px]">
                <WaterLevelChart data={activeLogs} isDark={resolvedTheme === 'dark'} devices={devices} timeframe={timeframe} selectedDeviceMac={selectedDeviceMac} />
             </div>
          </div>
          <div className="xl:col-span-4">
             <WaterTank level={waterInTank} />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
           <div className="xl:col-span-7 rounded-[2.5rem] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900 p-4">
              <div className="h-[500px] rounded-[2rem] overflow-hidden">
                <DeviceMap devices={devices.filter(d => selectedDeviceMac === 'ALL' || d.mac === selectedDeviceMac)} />
              </div>
           </div>
           <div className="xl:col-span-5 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col h-[532px]">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/50">
                 <h3 className="font-black uppercase text-slate-700 dark:text-white tracking-widest text-xs flex items-center gap-2"><Database size={16} className="text-indigo-500"/> Records</h3>
                 <span className="text-[10px] font-bold text-slate-400">Sync: {insights.lastUpdate}</span>
              </div>
              <div className="flex-grow overflow-auto">
                 <RecentLogs logs={activeLogs} />
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, unit, color }: any) {
  const colors: any = { blue: "text-blue-500 bg-blue-50", orange: "text-orange-500 bg-orange-50", pink: "text-pink-500 bg-pink-50", indigo: "text-indigo-500 bg-indigo-50" };
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-md">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colors[color]}`}>{icon}</div>
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</div>
      <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">{value} <span className="text-[10px] text-slate-400">{unit}</span></div>
    </div>
  );
}