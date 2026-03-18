'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import dynamic from 'next/dynamic';

import WaterLevelChart from '@/components/WaterLevelChart';
import StatusDonut from '@/components/StatusDonut';
import WaterTank from '@/components/WaterTank'; 
import RecentLogs from '@/components/RecentLogs'; 

import { 
  Waves, Sun, Moon, Activity, Thermometer, 
  Droplets, ChevronDown, Settings, Radio, Server, 
  CheckCircle2, ShieldAlert, AlertTriangle, TrendingUp, TrendingDown, Minus,
  LayoutDashboard, Database, Zap, Clock, Map as MapIcon
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
        const lData = await logRes.json();
        const dData = await devRes.json();
        setLogs(Array.isArray(lData) ? lData : []);
        setDevices(Array.isArray(dData) ? dData : []);
      }
    } catch (err) { console.error("Fetch error:", err); }
  }, [timeframe]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ✅ สูตรคำนวณระดับน้ำแบบปลอดภัย (แก้เป็น 61.4 ให้ตรงกับ ESP32 แล้ว)
  const calculateWater = (level: any) => {
    const raw = Number(level ?? 61.4); 
    let val = 61.4 - raw;              
    if (raw <= 0.5 || raw > 65) val = 0; // ถ้าระยะเพี้ยนเกินก้นถังไปมากให้ปัดเป็น 0
    return val < 0 ? 0 : (val > 20 ? 20 : val);
  };

  // ✅ คำนวณค่าเฉลี่ย (Safety Guard)
  const getMetrics = () => {
    if (!logs.length || !devices.length) return { water: 0, temp: 0, humid: 0 };

    let activeLogs: any[] = [];
    if (selectedDeviceMac === 'ALL') {
      activeLogs = devices.map(d => {
        const dLogs = logs.filter(l => (l.mac || l.device_id) === d.mac);
        return dLogs.length > 0 ? dLogs[dLogs.length - 1] : null;
      }).filter(Boolean);
    } else {
      const singleLogs = logs.filter(l => (l.mac || l.device_id) === selectedDeviceMac);
      if (singleLogs.length > 0) activeLogs = [singleLogs[singleLogs.length - 1]];
    }

    if (activeLogs.length === 0) return { water: 0, temp: 0, humid: 0 };

    const sum = activeLogs.reduce((acc, l) => ({
      water: acc.water + calculateWater(l.level),
      temp: acc.temp + (Number(l.temperature) || 0),
      humid: acc.humid + (Number(l.humidity || l.air_humidity) || 0)
    }), { water: 0, temp: 0, humid: 0 });

    return {
      water: sum.water / activeLogs.length,
      temp: sum.temp / activeLogs.length,
      humid: sum.humid / activeLogs.length
    };
  };

  const { water: waterInTank, temp: currentTemp, humid: currentHumid } = getMetrics();

  // ✅ คำนวณแนวโน้ม
  const getTrend = (current: number, key: string) => {
    const filtered = selectedDeviceMac === 'ALL' ? logs : logs.filter(l => (l.mac || l.device_id) === selectedDeviceMac);
    if (filtered.length < 2) return { direction: 'neutral', diff: 0 };
    
    const prev = filtered[filtered.length - 2];
    let prevVal = 0;
    if (key === 'level') prevVal = calculateWater(prev.level);
    else if (key === 'temp') prevVal = Number(prev.temperature || 0);
    else prevVal = Number(prev.humidity || prev.air_humidity || 0);
    
    const diff = current - prevVal;
    if (diff > 0.05) return { direction: 'up', diff: Math.abs(diff) };
    if (diff < -0.05) return { direction: 'down', diff: Math.abs(diff) };
    return { direction: 'neutral', diff: 0 };
  };

  const trends = {
    water: getTrend(waterInTank, 'level'),
    temp: getTrend(currentTemp, 'temp'),
    humid: getTrend(currentHumid, 'humid')
  };

  const status = waterInTank > 14 ? { label: "CRITICAL", color: "text-red-500", bg: "bg-red-500", icon: <ShieldAlert/>, border: "border-red-500/20" }
               : waterInTank > 7 ? { label: "WARNING", color: "text-orange-500", bg: "bg-orange-500", icon: <AlertTriangle/>, border: "border-orange-500/20" }
               : { label: "STABLE", color: "text-emerald-500", bg: "bg-emerald-500", icon: <CheckCircle2/>, border: "border-emerald-500/20" };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] transition-colors duration-500 pb-12">
      <header className="sticky top-0 z-[100] bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="p-2.5 bg-blue-600 rounded-2xl text-white shadow-xl"><Waves size={24}/></div>
            <div className="relative">
              <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900 px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider border border-transparent hover:border-blue-500/30">
                <Server size={14} className="text-blue-500" />
                {selectedDeviceMac === 'ALL' ? 'System Average' : devices.find(d => d.mac === selectedDeviceMac)?.name || 'Device'}
                <ChevronDown size={14} className={isDropdownOpen ? 'rotate-180' : ''} />
              </button>
              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-3 w-64 bg-white dark:bg-slate-900 shadow-2xl rounded-3xl border border-slate-200 dark:border-slate-800 p-2 overflow-hidden animate-in fade-in zoom-in-95">
                  <button onClick={() => { setSelectedDeviceMac('ALL'); setIsDropdownOpen(false); }} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl text-[10px] font-black uppercase transition-colors">🌍 System Average</button>
                  {devices.map((d: any) => (
                    <button key={d.mac} onClick={() => { setSelectedDeviceMac(d.mac); setIsDropdownOpen(false); }} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl text-[10px] font-bold uppercase transition-all">
                      <Radio size={14} className="text-slate-400" /> {d.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} className="p-3 text-slate-500"><Sun size={18}/></button>
            <Link href="/admin" className="p-3 text-slate-500"><Settings size={18} /></Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard label="Water Level (Avg)" val={waterInTank.toFixed(1)} unit="CM" icon={<Waves size={20}/>} color={status.color} trend={trends.water} />
          <MetricCard label="Temperature (Avg)" val={currentTemp.toFixed(1)} unit="°C" icon={<Thermometer size={20}/>} color="text-orange-500" trend={trends.temp} />
          <MetricCard label="Air Humidity (Avg)" val={currentHumid.toFixed(0)} unit="%" icon={<Droplets size={20}/>} color="text-cyan-500" trend={trends.humid} />
          <div className={`bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border-2 shadow-sm flex flex-col justify-between h-48 transition-all ${status.border}`}>
             <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Status</span>
                <div className={`p-2.5 rounded-2xl ${status.bg} text-white shadow-lg`}>{status.icon}</div>
             </div>
             <div className={`text-2xl font-black ${status.color} tracking-widest`}>{status.label}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm min-h-[550px] flex flex-col">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Activity size={18} className="text-blue-500" /> Trend Analytics</h3>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl shadow-inner">
                {['day', 'week', 'month'].map(tf => (
                  <button key={tf} onClick={() => setTimeframe(tf)} className={`px-6 py-2 text-[9px] font-black uppercase rounded-xl transition-all ${timeframe === tf ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-lg' : 'text-slate-500'}`}>{tf}</button>
                ))}
              </div>
            </div>
            <div className="flex-grow">
              <WaterLevelChart data={logs.filter(l => selectedDeviceMac === 'ALL' || (l.mac || l.device_id) === selectedDeviceMac)} timeframe={timeframe} isDark={resolvedTheme === 'dark'} devices={devices} selectedDeviceMac={selectedDeviceMac} />
            </div>
          </div>
          <div className="lg:col-span-4 flex flex-col gap-8">
            <WaterTank level={waterInTank} />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-7 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
             <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex items-center gap-3">
                <MapIcon size={18} className="text-slate-400" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Node Locations</h3>
             </div>
             <div className="flex-grow p-6">
                <div className="h-full w-full rounded-[2.5rem] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
                   <DeviceMap devices={devices.filter(d => selectedDeviceMac === 'ALL' || d.mac === selectedDeviceMac)} />
                </div>
             </div>
          </div>
          <div className="xl:col-span-5 flex flex-col gap-8">
             <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col max-h-[500px]">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                   <Database size={18} className="text-indigo-500" />
                   <h3 className="text-[10px] font-black uppercase tracking-widest">Recent Logs</h3>
                </div>
                <RecentLogs logs={logs.filter(l => selectedDeviceMac === 'ALL' || (l.mac || l.device_id) === selectedDeviceMac)} />
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function MetricCard({ label, val, unit, icon, color, trend }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800 shadow-sm flex flex-col justify-between h-48 group transition-all duration-300">
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</span>
        <div className={`p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 ${color}`}>{icon}</div>
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-black ${color} tracking-tighter`}>{val}</span>
          <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">{unit}</span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          {trend.direction === 'up' && <div className="flex items-center gap-1 text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full text-[9px] font-black"><TrendingUp size={12} /> UP {trend.diff.toFixed(1)}</div>}
          {trend.direction === 'down' && <div className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full text-[9px] font-black"><TrendingDown size={12} /> DOWN {trend.diff.toFixed(1)}</div>}
          {trend.direction === 'neutral' && <div className="flex items-center gap-1 text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-[9px] font-black"><Minus size={12} /> STABLE</div>}
        </div>
      </div>
    </div>
  );
}