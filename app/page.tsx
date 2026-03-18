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
  TrendingDown, Minus, Database, Map as MapIcon, Clock, Signal, 
  FileText, History, ActivitySquare, LayoutDashboard, Zap
} from 'lucide-react';

const DeviceMap = dynamic(() => import('@/components/DeviceMap'), { 
  ssr: false,
  loading: () => <div className="h-[400px] w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-[2.5rem]" />
});

export default function Home() {
  const [logs, setLogs] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDeviceMac, setSelectedDeviceMac] = useState<string>('ALL');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [timeframe, setTimeframe] = useState('day');
  const [lastNotifiedLogId, setLastNotifiedLogId] = useState<string | null>(null);
  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => { setIsMounted(true); }, []);
  useEffect(() => { if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission(); }, []);

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

  const calculateWater = useCallback((level: any) => {
    const raw = Number(level ?? 84.0); 
    let val = (84.0 - raw) - 5.0; 
    if (raw <= 0.5 || raw > 90) val = 0; 
    return val < 0 ? 0 : (val > 40 ? 40 : val); 
  }, []);

  const waterInTank = useMemo(() => {
    const filtered = selectedDeviceMac === 'ALL' ? logs : logs.filter(l => (l.mac || l.device_id) === selectedDeviceMac);
    return filtered.length > 0 ? calculateWater(filtered[filtered.length - 1].level) : 0;
  }, [logs, selectedDeviceMac, calculateWater]);

  // 🔥 เกณฑ์ใหม่: แดง 10, ส้ม 5
  const status = waterInTank >= 10 ? { label: "CRITICAL", color: "text-red-500", bg: "bg-red-500", icon: <ShieldAlert size={24}/>, border: "border-red-500", glow: "shadow-red-500/20" }
               : waterInTank >= 5 ? { label: "WARNING", color: "text-orange-500", bg: "bg-orange-500", icon: <AlertTriangle size={24}/>, border: "border-orange-500", glow: "shadow-orange-500/20" }
               : { label: "STABLE", color: "text-emerald-500", bg: "bg-emerald-500", icon: <CheckCircle2 size={24}/>, border: "border-emerald-500", glow: "shadow-emerald-500/20" };

  const insights = useMemo(() => {
    const filteredLogs = selectedDeviceMac === 'ALL' ? logs : logs.filter(l => (l.mac || l.device_id) === selectedDeviceMac);
    if (!filteredLogs.length) return { maxWater: 0, avgSignal: 0, rateOfChange: 0, timeToFlood: null, lastUpdate: 'N/A' };
    
    const allWater = filteredLogs.map(l => calculateWater(l.level));
    const latestLog = filteredLogs[filteredLogs.length - 1];
    const latestTime = new Date(latestLog.createdAt || Date.now()).getTime();
    const oldLog = filteredLogs.find(l => new Date(l.createdAt).getTime() >= latestTime - 3600000) || filteredLogs[0];
    const hourDiff = (latestTime - new Date(oldLog.createdAt).getTime()) / 3600000;
    const rate = hourDiff > 0 ? (calculateWater(latestLog.level) - calculateWater(oldLog.level)) / hourDiff : 0;

    let timeStr = null;
    if (rate > 0 && waterInTank < 10) {
      const mins = Math.round(((10 - waterInTank) / rate) * 60);
      timeStr = mins > 0 ? `${mins} นาที` : "เร็วๆ นี้";
    }

    return { 
      maxWater: Math.max(...allWater), 
      avgSignal: latestLog.signal || 0, 
      rateOfChange: rate, 
      timeToFlood: timeStr,
      lastUpdate: new Date(latestLog.createdAt).toLocaleTimeString('th-TH')
    };
  }, [logs, selectedDeviceMac, calculateWater, waterInTank]);

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#020617] transition-all duration-500 font-sans pb-10">
      <header className="sticky top-0 z-[100] bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-8 py-4 print:hidden">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white shadow-lg shadow-blue-500/30"><Waves size={24}/></div>
            <h1 className="text-xl font-black tracking-tight text-slate-800 dark:text-white uppercase">Flood Monitor Enterprise</h1>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => window.print()} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-500 transition-all"><FileText size={20}/></button>
             <button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-500 transition-all"><Sun size={20}/></button>
             <Link href="/admin" className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-500 transition-all"><Settings size={20} /></Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className={`lg:col-span-4 p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 ${status.border} ${status.glow} shadow-2xl flex flex-col justify-between relative overflow-hidden group`}>
             <div className="relative z-10">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">System Health</span>
                <div className={`text-5xl font-black mt-2 ${status.color} tracking-tighter`}>{status.label}</div>
             </div>
             <div className="mt-8 relative z-10 flex items-end justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-500 uppercase">Live Water Level</div>
                  <div className="text-6xl font-black text-slate-800 dark:text-white tabular-nums">{waterInTank.toFixed(1)}<span className="text-xl ml-2 text-slate-400">cm</span></div>
                </div>
                <div className={`p-4 rounded-3xl ${status.bg} text-white shadow-xl animate-pulse`}>{status.icon}</div>
             </div>
             <div className={`absolute -right-10 -bottom-10 opacity-5 ${status.color} group-hover:scale-110 transition-transform duration-700`}><ShieldAlert size={250} /></div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
             <StatCard icon={<TrendingUp />} label="Highest" value={insights.maxWater.toFixed(1)} unit="cm" color="blue" />
             <StatCard icon={<ActivitySquare />} label="Rate" value={(insights.rateOfChange > 0 ? "+" : "") + insights.rateOfChange.toFixed(1)} unit="cm/h" color="orange" />
             <StatCard icon={<Zap />} label="Prediction" value={insights.timeToFlood || "Stable"} unit="" color="pink" />
             <StatCard icon={<Signal />} label="Signal" value={insights.avgSignal} unit="CSQ" color="indigo" />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-8 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl min-h-[500px]">
             <div className="flex justify-between items-center mb-8">
                <h3 className="font-black text-slate-700 dark:text-white uppercase tracking-wider flex items-center gap-3"><Activity className="text-blue-500"/> Trend Analysis</h3>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  {['day', 'week', 'month'].map(tf => (
                    <button key={tf} onClick={() => setTimeframe(tf)} className={`px-5 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${timeframe === tf ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-md' : 'text-slate-500'}`}>{tf}</button>
                  ))}
                </div>
             </div>
             <div className="h-[380px]">
                <WaterLevelChart data={logs} isDark={resolvedTheme === 'dark'} devices={devices} timeframe={timeframe} selectedDeviceMac={selectedDeviceMac} />
             </div>
          </div>
          <div className="xl:col-span-4">
             <WaterTank level={waterInTank} />
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, unit, color }: any) {
  const colors: any = {
    blue: "text-blue-500 bg-blue-50 dark:bg-blue-500/10",
    orange: "text-orange-500 bg-orange-50 dark:bg-orange-500/10",
    pink: "text-pink-500 bg-pink-50 dark:bg-pink-500/10",
    indigo: "text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
  };
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-md group">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colors[color]}`}>{icon}</div>
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</div>
      <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">{value} <span className="text-[10px] text-slate-400">{unit}</span></div>
    </div>
  );
}