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
  Map as MapIcon, Database, LayoutDashboard, Settings,
  Radio, Clock, Server, CheckCircle2, ShieldAlert, Zap,
  TrendingUp, TrendingDown, Minus
} from 'lucide-react';

const DeviceMap = dynamic(() => import('@/components/DeviceMap'), { 
  ssr: false,
  loading: () => (
    <div className="h-[450px] w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-[2.5rem] flex items-center justify-center text-slate-400">
      <div className="flex flex-col items-center gap-2">
        <MapIcon className="animate-bounce" />
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Initializing Map Service</span>
      </div>
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

  // --- Filter Logic ---
  const displayDevices = selectedDeviceMac === 'ALL' ? devices : devices.filter(d => d.mac === selectedDeviceMac);
  const displayLogs = selectedDeviceMac === 'ALL' ? logs : logs.filter(l => (l.mac || l.device_id) === selectedDeviceMac);
  const latestLog = displayLogs.length > 0 ? displayLogs[displayLogs.length - 1] : null;
  const currentDevice = displayDevices.length > 0 ? displayDevices[0] : null;

  // --- Logic 95-20 คำนวณระดับน้ำ ---
  const calculateWater = (level: any) => {
    const raw = Number(level ?? 95);
    let val = 95 - raw;
    if (raw <= 0.5 || raw > 85) val = 0;
    if (val > 20) val = 20;
    if (val < 0) val = 0;
    return val;
  };

  const waterInTank = calculateWater(latestLog?.level);
  const currentTemp = Number(latestLog?.temperature ?? 0);
  const currentHumid = Number(latestLog?.humidity ?? latestLog?.air_humidity ?? 0);

  // --- Logic คำนวณแนวโน้ม (Trend) ---
  const getTrend = (current: number, dataArray: any[], key: string) => {
    if (dataArray.length < 2) return { direction: 'neutral', diff: 0 };
    const prevLog = dataArray[dataArray.length - 2];
    let prevVal = 0;
    if (key === 'level') prevVal = calculateWater(prevLog?.level);
    else if (key === 'temp') prevVal = Number(prevLog?.temperature || 0);
    else prevVal = Number(prevLog?.humidity || prevLog?.air_humidity || 0);

    const diff = current - prevVal;
    if (diff > 0.05) return { direction: 'up', diff: Math.abs(diff) };
    if (diff < -0.05) return { direction: 'down', diff: Math.abs(diff) };
    return { direction: 'neutral', diff: 0 };
  };

  const trends = {
    water: getTrend(waterInTank, displayLogs, 'level'),
    temp: getTrend(currentTemp, displayLogs, 'temp'),
    humid: getTrend(currentHumid, displayLogs, 'humid')
  };

  const getStatusInfo = (w: number) => {
    if (w > 14) return { label: "CRITICAL", icon: <ShieldAlert size={20}/>, color: "text-red-500", bg: "bg-red-500", border: "border-red-500/50" };
    if (w > 7) return { label: "WARNING", icon: <AlertTriangle size={20}/>, color: "text-orange-500", bg: "bg-orange-500", border: "border-orange-500/50" };
    return { label: "STABLE", icon: <CheckCircle2 size={20}/>, color: "text-emerald-500", bg: "bg-emerald-500", border: "border-emerald-500/50" };
  };

  const status = getStatusInfo(waterInTank);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] transition-colors duration-500 pb-12">
      
      {/* Header */}
      <header className="sticky top-0 z-[100] w-full bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3 group">
              <div className="p-2.5 bg-slate-950 dark:bg-blue-600 rounded-2xl text-white shadow-xl transition-all group-hover:scale-110">
                <Waves size={24}/>
              </div>
              <div className="hidden md:block">
                <h1 className="text-lg font-black tracking-tight">FLOODPRO</h1>
                <p className="text-[9px] font-bold text-slate-400 tracking-[0.2em] uppercase">IoT Analytics</p>
              </div>
            </div>

            <div className="relative">
              <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900 px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all hover:bg-slate-200 dark:hover:bg-slate-800 border border-transparent hover:border-blue-500/30">
                <Radio size={14} className="text-blue-500" />
                {selectedDeviceMac === 'ALL' ? 'Global Overview' : currentDevice?.name}
                <ChevronDown size={14} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-3 w-72 bg-white dark:bg-slate-900 shadow-2xl rounded-3xl border border-slate-200 dark:border-slate-800 p-2 animate-in fade-in zoom-in-95">
                  <button onClick={() => { setSelectedDeviceMac('ALL'); setIsDropdownOpen(false); }} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl text-[10px] font-black uppercase transition-colors">
                    <Server size={14} /> Global Overview
                  </button>
                  <div className="h-px bg-slate-100 dark:bg-slate-800 mx-3 my-1" />
                  {devices.map((d: any) => (
                    <button key={d.mac} onClick={() => { setSelectedDeviceMac(d.mac); setIsDropdownOpen(false); }} className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl text-[10px] font-bold transition-all">
                      <span className="flex items-center gap-3 uppercase"><Radio size={14} className="text-slate-400" /> {d.name}</span>
                      <div className={`w-1.5 h-1.5 rounded-full ${checkOnline(d.updatedAt) ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-500'}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-2xl transition-all text-slate-500">
              {resolvedTheme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}
            </button>
            <Link href="/admin" className="p-3 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-2xl transition-all text-slate-500">
              <Settings size={18} />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto p-6 space-y-8">
        
        {/* Metric Cards with Trends */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard label="Water Level" val={waterInTank.toFixed(1)} unit="CM" icon={<Waves size={20}/>} color={status.color} trend={trends.water} />
          <MetricCard label="Temperature" val={currentTemp.toFixed(1)} unit="°C" icon={<Thermometer size={20}/>} color="text-orange-500" trend={trends.temp} />
          <MetricCard label="Air Humidity" val={currentHumid.toFixed(0)} unit="%" icon={<Droplets size={20}/>} color="text-cyan-500" trend={trends.humid} />
          <div className={`bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border-2 shadow-sm flex flex-col justify-between h-48 transition-all ${status.border}`}>
             <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Safety System</span>
                <div className={`p-2.5 rounded-2xl ${status.bg} text-white shadow-lg`}>{status.icon}</div>
             </div>
             <div className={`text-2xl font-black ${status.color} tracking-widest`}>{status.label}</div>
          </div>
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col min-h-[550px]">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-10">
              <div className="flex items-center gap-3">
                <Activity size={18} className="text-blue-500" />
                <h3 className="text-xs font-black uppercase tracking-widest">Trend Analytics</h3>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                {['day', 'week', 'month'].map(tf => (
                  <button key={tf} onClick={() => setTimeframe(tf)} className={`px-6 py-2 text-[9px] font-black uppercase rounded-xl transition-all ${timeframe === tf ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-lg' : 'text-slate-500'}`}>{tf}</button>
                ))}
              </div>
            </div>
            <div className="flex-grow">
              <WaterLevelChart data={displayLogs} timeframe={timeframe} isDark={resolvedTheme === 'dark'} devices={devices} selectedDeviceMac={selectedDeviceMac} />
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-8">
            <WaterTank level={waterInTank} />
            <div className="bg-slate-950 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
               <Zap className="absolute -right-4 -bottom-4 text-white/10 w-32 h-32 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
               <p className="text-2xl font-black leading-tight mb-6">Autonomous<br/>Monitoring</p>
               <div className="flex items-center gap-2 bg-white/10 w-fit px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
                  <Clock size={12} className="text-blue-400" />
                  <span className="text-[9px] font-black uppercase">Live Updates</span>
               </div>
            </div>
          </div>
        </div>

        {/* Map & Logs */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-7 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex items-center gap-3">
              <MapIcon size={18} className="text-slate-400" />
              <h3 className="text-[10px] font-black uppercase tracking-widest">Geospatial Distribution</h3>
            </div>
            <div className="flex-grow p-6">
               <div className="h-full w-full rounded-[2rem] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
                  <DeviceMap devices={displayDevices} />
               </div>
            </div>
          </div>

          <div className="xl:col-span-5 flex flex-col gap-8">
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex-grow flex flex-col max-h-[500px]">
               <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                  <Database size={18} className="text-indigo-500" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest">Recent Logs</h3>
               </div>
               <RecentLogs logs={displayLogs} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function MetricCard({ label, val, unit, icon, color, trend }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800 shadow-sm flex flex-col justify-between h-48 group hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-300">
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</span>
        <div className={`p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 group-hover:rotate-12 transition-transform ${color}`}>{icon}</div>
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-black ${color} tracking-tighter`}>{val}</span>
          <span className="text-[10px] font-black text-slate-400 tracking-widest">{unit}</span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          {trend.direction === 'up' && (
            <div className="flex items-center gap-1 text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full text-[9px] font-black">
              <TrendingUp size={12} /> UP {trend.diff.toFixed(1)}
            </div>
          )}
          {trend.direction === 'down' && (
            <div className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full text-[9px] font-black">
              <TrendingDown size={12} /> DOWN {trend.diff.toFixed(1)}
            </div>
          )}
          {trend.direction === 'neutral' && (
            <div className="flex items-center gap-1 text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-[9px] font-black">
              <Minus size={12} /> STABLE
            </div>
          )}
        </div>
      </div>
    </div>
  );
}