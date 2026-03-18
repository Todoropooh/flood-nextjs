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
  Radio, Server, CheckCircle2, ShieldAlert, AlertTriangle,
  TrendingUp, Signal, Database, Clock, FileText, History, ActivitySquare
} from 'lucide-react';

const DeviceMap = dynamic(() => import('@/components/DeviceMap'), { 
  ssr: false,
  loading: () => <div className="h-[400px] w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl" />
});

// ===================== SIGNAL =====================
function SignalBars({ csq }) {
  let bars = 0;
  if (csq > 20 && csq !== 99) bars = 4;
  else if (csq > 14) bars = 3;
  else if (csq > 9) bars = 2;
  else if (csq > 0 && csq !== 99) bars = 1;

  return (
    <div className="flex items-end gap-[3px] h-5">
      {[1,2,3,4].map(b => (
        <div key={b} className={`w-1.5 rounded-sm ${b <= bars ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`} style={{height: `${b*25}%`}}/>
      ))}
    </div>
  );
}

// ===================== MAIN =====================
export default function Home() {
  const [logs, setLogs] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceMac, setSelectedDeviceMac] = useState('ALL');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [timeframe, setTimeframe] = useState('day');

  const { setTheme, resolvedTheme } = useTheme();

  // ===================== FETCH =====================
  const fetchData = useCallback(async () => {
    try {
      const t = Date.now();
      const [logRes, devRes] = await Promise.all([
        fetch(`/api/flood?timeframe=${timeframe}&t=${t}`),
        fetch(`/api/devices?t=${t}`)
      ]);

      const l = await logRes.json();
      const d = await devRes.json();

      setLogs(Array.isArray(l) ? l : []);
      setDevices(Array.isArray(d) ? d : []);
    } catch (err) {
      console.error(err);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchData();
    const i = setInterval(fetchData, 5000);
    return () => clearInterval(i);
  }, [fetchData]);

  // ===================== CALC =====================
  const calculateWater = (level) => {
    const raw = Number(level ?? 84);
    let val = (84 - raw) - 5;
    if (raw <= 0.5 || raw > 90) val = 0;
    return Math.max(0, Math.min(40, val));
  };

  const waterInTank = useMemo(() => {
    if (!logs.length) return 0;
    const last = logs[logs.length - 1];
    return calculateWater(last.level);
  }, [logs]);

  // ===================== STATUS =====================
  const status =
    waterInTank >= 20
      ? { label: 'CRITICAL', color: 'text-red-500', bg: 'bg-red-500' }
      : waterInTank >= 10
      ? { label: 'WARNING', color: 'text-orange-500', bg: 'bg-orange-500' }
      : { label: 'STABLE', color: 'text-emerald-500', bg: 'bg-emerald-500' };

  // ===================== INSIGHT =====================
  const insights = useMemo(() => {
    if (!logs.length) return { max: 0, total: 0 };

    return {
      max: Math.max(...logs.map(l => calculateWater(l.level))),
      total: logs.length
    };
  }, [logs]);

  return (
    <div className="
      min-h-screen 
      bg-gradient-to-br 
      from-slate-50 via-blue-50 to-indigo-100
      dark:from-[#020617] dark:via-slate-900 dark:to-black
      pb-10
    ">

      {/* HEADER */}
      <header className="sticky top-0 z-50 backdrop-blur bg-white/70 dark:bg-slate-900/70 border-b px-6 py-3 flex justify-between">
        
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-xl">
            <Waves size={18}/>
          </div>

          <button onClick={()=>setIsDropdownOpen(!isDropdownOpen)} className="text-sm font-bold">
            {selectedDeviceMac}
          </button>
        </div>

        <div className="flex gap-3">
          <button onClick={()=>setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
            <Sun size={18}/>
          </button>
          <Link href="/admin">
            <Settings size={18}/>
          </Link>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto p-6 space-y-6">

        {/* HERO */}
        <div className="rounded-3xl p-6 bg-white/60 dark:bg-slate-900/60 backdrop-blur shadow-lg">
          <h1 className={`text-5xl font-black ${status.color}`}>
            {waterInTank.toFixed(1)} CM
          </h1>
          <p className="text-slate-400 mt-2">Water Level</p>

          <div className={`mt-4 inline-block px-4 py-2 rounded-xl text-white text-xs ${status.bg}`}>
            {status.label}
          </div>
        </div>

        {/* METRICS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Water" val={waterInTank.toFixed(1)} unit="cm" icon={<Waves/>} color="text-blue-500"/>
          <MetricCard label="Max" val={insights.max.toFixed(1)} unit="cm" icon={<TrendingUp/>} color="text-indigo-500"/>
          <MetricCard label="Logs" val={insights.total} unit="" icon={<Database/>} color="text-amber-500"/>
          <MetricCard label="Signal" val="Good" unit="" icon={<Signal/>} color="text-green-500"/>
        </div>

        {/* CHART */}
        <div className="bg-white/60 dark:bg-slate-900/60 p-6 rounded-3xl shadow-lg">
          <WaterLevelChart data={logs} timeframe={timeframe} />
        </div>

        {/* TANK */}
        <div className="bg-white/60 dark:bg-slate-900/60 p-6 rounded-3xl shadow-lg">
          <WaterTank level={waterInTank}/>
        </div>

        {/* MAP */}
        <DeviceMap devices={devices}/>

        {/* LOG */}
        <div className="bg-white/60 dark:bg-slate-900/60 p-6 rounded-3xl shadow-lg">
          <RecentLogs logs={logs}/>
        </div>

      </main>
    </div>
  );
}

// ===================== CARD =====================
function MetricCard({ label, val, unit, icon, color }) {
  return (
    <div className="
      bg-white/60 dark:bg-slate-900/60 
      backdrop-blur 
      p-5 rounded-2xl shadow 
      hover:shadow-xl transition
    ">
      <div className="flex justify-between">
        <span className="text-xs text-slate-500">{label}</span>
        <div className={color}>{icon}</div>
      </div>

      <div className="mt-3 flex items-end gap-2">
        <span className={`text-3xl font-black ${color}`}>{val}</span>
        <span className="text-xs text-slate-400">{unit}</span>
      </div>
    </div>
  );
}
