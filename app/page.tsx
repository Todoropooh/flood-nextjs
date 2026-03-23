'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Import Components แบบป้องกัน Error
import WaterLevelChart from '@/components/WaterLevelChart';
import WaterTank from '@/components/WaterTank'; 
import RecentLogs from '@/components/RecentLogs'; 

import { 
  Waves, Sun, Activity, Thermometer, Droplets, ChevronDown, Settings, 
  Radio, Server, CheckCircle2, ShieldAlert, AlertTriangle, TrendingUp, 
  Database, Clock, Signal, FileText, ActivitySquare, Zap, Loader2, Download
} from 'lucide-react';

const DeviceMap = dynamic(() => import('@/components/DeviceMap'), { 
  ssr: false,
  loading: () => <div className="h-[450px] w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-[2.5rem] flex items-center justify-center text-slate-400">Loading Map...</div>
});

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
  }, []);

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
    } catch (err) { 
      console.error("Fetch error:", err); 
    }
  }, [timeframe]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const calculateWater = useCallback((level: any, installHeight: number = 62.0) => {
    const raw = Number(level ?? installHeight); 
    let val = (installHeight - raw); 
    if (raw <= 0.5 || raw > (installHeight + 15)) val = 0; 
    return val < 0 ? 0 : (val > 40 ? 40 : val); 
  }, []);

  const activeLogs = useMemo(() => {
    if (!Array.isArray(logs) || logs.length === 0) return [];
    return selectedDeviceMac === 'ALL' ? logs : logs.filter(l => (l.mac || l.device_id) === selectedDeviceMac);
  }, [logs, selectedDeviceMac]);

  const waterInTank = useMemo(() => {
    if (activeLogs.length === 0) return 0;
    const lastEntry = activeLogs[activeLogs.length - 1];
    const device = devices.find(d => d.mac === (lastEntry.mac || lastEntry.device_id));
    const currentInstallHeight = device?.installHeight ?? 62.0;
    return calculateWater(lastEntry?.level, currentInstallHeight);
  }, [activeLogs, calculateWater, devices]);

  const activeThresholds = useMemo(() => {
    if (selectedDeviceMac !== 'ALL') {
      const d = devices.find(d => d.mac === selectedDeviceMac);
      return { warning: d?.warningThreshold ?? 5.0, critical: d?.criticalThreshold ?? 10.0, installHeight: d?.installHeight ?? 62.0 };
    }
    if (activeLogs.length > 0) {
      const latestLog = activeLogs[activeLogs.length - 1];
      const d = devices.find(d => d.mac === (latestLog.mac || latestLog.device_id));
      return { warning: d?.warningThreshold ?? 5.0, critical: d?.criticalThreshold ?? 10.0, installHeight: d?.installHeight ?? 62.0 };
    }
    return { warning: 5.0, critical: 10.0, installHeight: 62.0 };
  }, [selectedDeviceMac, devices, activeLogs]);

  const status = useMemo(() => {
    if (waterInTank >= activeThresholds.critical) return { label: "CRITICAL", color: "text-red-500", bg: "bg-red-500", icon: <ShieldAlert size={24}/>, border: "border-red-500", glow: "shadow-red-500/20" };
    if (waterInTank >= activeThresholds.warning) return { label: "WARNING", color: "text-orange-500", bg: "bg-orange-500", icon: <AlertTriangle size={24}/>, border: "border-orange-500", glow: "shadow-orange-500/20" };
    return { label: "STABLE", color: "text-emerald-500", bg: "bg-emerald-500", icon: <CheckCircle2 size={24}/>, border: "border-emerald-500", glow: "shadow-emerald-500/20" };
  }, [waterInTank, activeThresholds]);

  // 🔮 Prediction Insights (ปรับปรุงใหม่)
  const insights = useMemo(() => {
    if (activeLogs.length < 2) {
      return { maxWater: 0, avgSignal: 0, rateOfChange: 0, timeToFlood: null, lastUpdate: 'Waiting...', percentToCritical: 0 };
    }
    try {
      const latestLog = activeLogs[activeLogs.length - 1];
      const device = devices.find(d => d.mac === (latestLog.mac || latestLog.device_id));
      const h = device?.installHeight ?? 62.0;
      const crit = device?.criticalThreshold ?? 10.0;
      const currentWater = calculateWater(latestLog.level, h);

      const allWater = activeLogs.map(l => calculateWater(l.level, h));
      const latestTime = new Date(latestLog?.createdAt || Date.now()).getTime();
      const thirtyMinsAgo = latestTime - (30 * 60000);
      const oldLog = activeLogs.find(l => new Date(l.createdAt).getTime() >= thirtyMinsAgo) || activeLogs[0];
      
      const hourDiff = (latestTime - new Date(oldLog.createdAt).getTime()) / 3600000;
      const rate = hourDiff > 0 ? (currentWater - calculateWater(oldLog.level, h)) / hourDiff : 0;

      let timeStr = "คงที่ (Stable)";
      if (rate > 0.1 && currentWater < crit) {
        const mins = Math.round(((crit - currentWater) / rate) * 60);
        timeStr = mins > 60 ? `ประมาณ ${Math.floor(mins/60)} ชม. ${mins%60} นาที` : `${mins} นาที`;
      } else if (currentWater >= crit) {
        timeStr = "วิกฤตแล้ว (Now)";
      }

      return { 
        maxWater: Math.max(...allWater, 0), 
        avgSignal: latestLog?.signal === 99 ? 0 : (latestLog?.signal || 0), 
        rateOfChange: rate, 
        timeToFlood: timeStr,
        lastUpdate: latestLog?.createdAt ? new Date(latestLog.createdAt).toLocaleTimeString('th-TH') : 'N/A',
        percentToCritical: Math.min(100, (currentWater / crit) * 100)
      };
    } catch (e) {
      return { maxWater: 0, avgSignal: 0, rateOfChange: 0, timeToFlood: null, lastUpdate: 'Error', percentToCritical: 0 };
    }
  }, [activeLogs, calculateWater, waterInTank, activeThresholds, devices]);

  const exportToCSV = () => {
    if (!activeLogs || activeLogs.length === 0) { alert("ไม่มีข้อมูลสำหรับดาวน์โหลดครับ"); return; }
    let csvContent = "วันที่,เวลา,อุปกรณ์ (MAC),ระดับน้ำ (cm),อุณหภูมิ (C),ความชื้น (%)\n";
    activeLogs.forEach((log: any) => {
      const device = devices.find(d => d.mac === (log.mac || log.device_id));
      const h = device?.installHeight ?? 62.0;
      const calcLevel = calculateWater(log.level, h);
      csvContent += `${new Date(log.createdAt).toLocaleDateString('th-TH')},${new Date(log.createdAt).toLocaleTimeString('th-TH')},${log.mac || log.device_id},${calcLevel.toFixed(2)},${(log.temperature || 0).toFixed(1)},${(log.humidity || log.air_humidity || 0).toFixed(1)}\n`;
    });
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `WaterLevel_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#020617] transition-all duration-500 font-sans pb-10">
      <header className="sticky top-0 z-[100] bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-8 py-4 print:hidden">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white shadow-lg shadow-blue-500/20"><Waves size={24}/></div>
            <div className="relative">
              <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest border border-slate-200 dark:border-slate-800 transition-all hover:bg-slate-200 dark:hover:bg-slate-800">
                <Server size={16} className="text-blue-500" />
                {selectedDeviceMac === 'ALL' ? 'System Overview' : devices.find(d => d.mac === selectedDeviceMac)?.name || 'Device'}
                <ChevronDown size={16} className={isDropdownOpen ? 'rotate-180 transition-transform' : ''} />
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
             <button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-500 transition-colors"><Sun size={20}/></button>
             <Link href="/admin" className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-500 transition-all"><Settings size={20} /></Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 space-y-8">
        
        {/* 🔮 NEW: Prediction Visualizer Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-indigo-950 dark:to-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group border border-white/5 transition-all hover:shadow-indigo-500/10">
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
            <div className="space-y-4 text-center lg:text-left flex-1">
              <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-400 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-blue-500/20">
                <Zap size={14} className="fill-blue-400" /> AI Forecast Analysis
              </div>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
                {insights.rateOfChange > 0.5 
                  ? `น้ำกำลังสูงขึ้น! คาดว่าจะถึงขีดจำกัดใน ${insights.timeToFlood}` 
                  : insights.rateOfChange < -0.5 
                    ? "ระดับน้ำกำลังลดลงอย่างต่อเนื่อง" 
                    : "สถานการณ์ระดับน้ำปกติดี (Stable)"}
              </h2>
              <p className="text-slate-400 text-sm font-medium">
                วิเคราะห์จากอัตราความเร็วปัจจุบัน: <span className="text-white font-bold">{insights.rateOfChange.toFixed(2)} cm/h</span>
              </p>
            </div>

            <div className="w-full lg:w-96 space-y-4 bg-white/5 p-6 rounded-[2rem] border border-white/5 backdrop-blur-md">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>Current Capacity</span>
                <span className={insights.percentToCritical > 80 ? 'text-red-400' : 'text-emerald-400'}>{insights.percentToCritical.toFixed(0)}% to Critical</span>
              </div>
              <div className="h-4 w-full bg-slate-700/50 rounded-full overflow-hidden p-1">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${insights.percentToCritical > 80 ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : insights.percentToCritical > 50 ? 'bg-orange-500' : 'bg-emerald-500'}`}
                  style={{ width: `${insights.percentToCritical}%` }}
                />
              </div>
              <div className="flex justify-between items-center pt-2">
                 <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-bold text-slate-500 uppercase">Live Processing</span>
                 </div>
                 <span className="text-[10px] font-bold text-blue-400 uppercase">Update: {insights.lastUpdate}</span>
              </div>
            </div>
          </div>
          <Activity className="absolute -right-20 -bottom-20 size-80 text-white/[0.03] -rotate-12 group-hover:rotate-0 transition-transform duration-1000" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className={`lg:col-span-4 p-8 rounded-[3rem] bg-white dark:bg-slate-900 border-2 ${status.border} shadow-2xl flex flex-col justify-between relative overflow-hidden group transition-all duration-300 ${status.glow}`}>
             <div className="relative z-10">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Live Status</span>
                <div className={`text-5xl font-black mt-2 ${status.color} tracking-tighter`}>{status.label}</div>
             </div>
             <div className="mt-12 relative z-10 flex items-end justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-500 uppercase">Current Level</div>
                  <div className="text-6xl font-black text-slate-800 dark:text-white tabular-nums">{waterInTank.toFixed(1)}<span className="text-xl ml-2 text-slate-400">cm</span></div>
                </div>
                <div className={`p-5 rounded-[1.5rem] ${status.bg} text-white shadow-2xl animate-bounce`}>{status.icon}</div>
             </div>
          </div>
          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
             <StatCard icon={<TrendingUp />} label="Highest" value={insights.maxWater.toFixed(1)} unit="cm" color="blue" />
             <StatCard icon={<ActivitySquare />} label="Rate" value={(insights.rateOfChange > 0 ? "+" : "") + insights.rateOfChange.toFixed(1)} unit="cm/h" color="orange" />
             <StatCard icon={<Zap />} label="Prediction" value={insights.timeToFlood || "Stable"} unit="" color="pink" />
             <StatCard icon={<Signal />} label="Signal" value={insights.avgSignal} unit="CSQ" color="indigo" />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-8 bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-xl min-h-[550px]">
             <div className="h-[450px]">
                <WaterLevelChart data={activeLogs} isDark={resolvedTheme === 'dark'} devices={devices} timeframe={timeframe} selectedDeviceMac={selectedDeviceMac} />
             </div>
          </div>
          <div className="xl:col-span-4"><WaterTank level={waterInTank} warningThreshold={activeThresholds.warning} criticalThreshold={activeThresholds.critical} /></div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
           <div className="xl:col-span-7 rounded-[3rem] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900 p-4">
              <div className="h-[550px] rounded-[2.5rem] overflow-hidden">
                <DeviceMap devices={devices.filter(d => selectedDeviceMac === 'ALL' || d.mac === selectedDeviceMac)} />
              </div>
           </div>
           
           <div className="xl:col-span-5 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col h-[582px]">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/50">
                 <div>
                   <h3 className="font-black uppercase text-slate-700 dark:text-white tracking-widest text-xs flex items-center gap-2">
                     <Database size={16} className="text-indigo-500"/> Records Log
                   </h3>
                   <span className="text-[10px] font-bold text-slate-400 mt-1 block uppercase">Sync Time: {insights.lastUpdate}</span>
                 </div>
                 
                 <button onClick={exportToCSV} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/30 active:scale-95">
                   <Download size={14} /> Export CSV
                 </button>
              </div>
              <div className="flex-grow overflow-auto">
                 <RecentLogs logs={activeLogs} devices={devices} /> 
              </div>
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
    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-md transition-transform hover:-translate-y-1">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${colors[color]}`}>{icon}</div>
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</div>
      <div className="text-2xl font-black text-slate-800 dark:text-white mt-1 tabular-nums">{value} <span className="text-[10px] text-slate-400 font-bold ml-1">{unit}</span></div>
    </div>
  );
}