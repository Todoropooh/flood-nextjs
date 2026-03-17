'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// 🚨 ใส่ any เพื่อให้ผ่านการตรวจ Type ตอน Build
import WaterLevelChart from '@/components/WaterLevelChart';
import StatusDonut from '@/components/StatusDonut';

import { 
  Waves, Settings, Sun, Moon, Activity, Thermometer, 
  Droplets, ChevronDown, AlertTriangle, CheckCircle
} from 'lucide-react';

// โหลดแผนที่แบบ Client-side เท่านั้น
const DeviceMap = dynamic(() => import('@/components/DeviceMap'), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-100 animate-pulse flex items-center justify-center text-slate-400">กำลังโหลดแผนที่...</div>
});

export const dynamic = 'force-dynamic';

export default function Home() {
  const [logs, setLogs] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDeviceMac, setSelectedDeviceMac] = useState<string>('ALL');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [timeframe, setTimeframe] = useState('day');
  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    setIsMounted(true);
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [timeframe]);

  const fetchData = async () => {
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
  };

  if (!isMounted) return <div className="min-h-screen bg-slate-50" />;

  const displayDevices = selectedDeviceMac === 'ALL' ? devices : devices.filter(d => d.mac === selectedDeviceMac);
  const displayLogs = selectedDeviceMac === 'ALL' ? logs : logs.filter(l => l.mac === selectedDeviceMac);
  
  // ป้องกันค่าเป็น null ก่อนเรียกใช้งาน
  const latestLog = displayLogs.length > 0 ? displayLogs[displayLogs.length - 1] : null;
  const currentDevice = displayDevices.length > 0 ? displayDevices[0] : null;

  const currentLevel = Number(latestLog?.level || currentDevice?.waterLevel || 0);
  const currentTemp = Number(latestLog?.temperature || currentDevice?.temperature || 0);
  const currentHumid = Number(latestLog?.air_humidity || currentDevice?.humidity || 0);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      {/* Header */}
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg"><Waves size={24}/></div>
          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 font-bold text-sm uppercase"
            >
              {selectedDeviceMac === 'ALL' ? '🌍 Overview' : `📍 ${currentDevice?.name || 'Device'}`}
              <ChevronDown size={16} />
            </button>
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white shadow-2xl rounded-2xl border border-slate-100 z-50 p-2">
                <button onClick={() => {setSelectedDeviceMac('ALL'); setIsDropdownOpen(false);}} className="w-full text-left px-4 py-2 hover:bg-slate-50 rounded-lg text-xs font-bold uppercase">🌍 Overview</button>
                {devices.map((d: any) => (
                  <button key={d.mac} onClick={() => {setSelectedDeviceMac(d.mac); setIsDropdownOpen(false);}} className="w-full text-left px-4 py-2 hover:bg-slate-50 rounded-lg text-xs font-bold uppercase">📍 {d.name}</button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
            <button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} className="p-2 bg-white rounded-xl border shadow-sm">
                {resolvedTheme === 'dark' ? <Sun size={20}/> : <Moon size={20}/>}
            </button>
            <Link href="/admin" className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase shadow-lg flex items-center gap-2">
                <Settings size={16}/> Admin
            </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Max Level" val={currentLevel.toFixed(1)} unit="cm" icon={<Waves/>} color="text-blue-600" />
          <MetricCard label="Temperature" val={currentTemp.toFixed(1)} unit="°C" icon={<Thermometer/>} color="text-orange-500" />
          <MetricCard label="Humidity" val={currentHumid.toFixed(0)} unit="%" icon={<Droplets/>} color="text-emerald-500" />
          <MetricCard label="Status" val={currentLevel >= 7 ? "CRITICAL" : "NORMAL"} unit="" icon={<Activity/>} color={currentLevel >= 7 ? "text-red-500" : "text-emerald-500"} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm h-[450px] flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2"><Activity size={18} className="text-blue-600"/> Trend Analytics</h3>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    {['day', 'week', 'month'].map(tf => (
                        <button key={tf} onClick={() => setTimeframe(tf)} className={`px-3 py-1 text-[10px] font-bold uppercase rounded-lg ${timeframe === tf ? 'bg-white shadow-sm' : 'text-slate-500'}`}>{tf}</button>
                    ))}
                </div>
            </div>
            <div className="flex-grow">
                {/* ส่ง Props แบบกว้างๆ เพื่อป้องกัน Build Error */}
                <WaterLevelChart data={displayLogs} timeframe={timeframe} isDark={resolvedTheme === 'dark'} />
            </div>
          </div>

          <div className="lg:col-span-4 bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center">
            <h3 className="text-xs font-black uppercase tracking-widest mb-4 self-start">Status Distribution</h3>
            <div className="w-full h-[300px]">
                <StatusDonut logs={displayLogs} isDark={resolvedTheme === 'dark'} />
            </div>
          </div>
        </div>

        <div className="bg-white p-2 rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-[450px] w-full rounded-[2rem] overflow-hidden">
            <DeviceMap devices={displayDevices} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, val, unit, icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-40">
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
        <div className={`p-2 rounded-xl bg-slate-50 ${color}`}>{icon}</div>
      </div>
      <div>
        <span className={`text-4xl font-black ${color}`}>{val}</span>
        <span className="text-xs font-bold text-slate-400 ml-1">{unit}</span>
      </div>
    </div>
  );
}