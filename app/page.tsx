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
  TrendingDown, Minus, Database, Map as MapIcon, Clock, Signal, BarChart3,
  FileText, History, ActivitySquare
} from 'lucide-react';

const DeviceMap = dynamic(() => import('@/components/DeviceMap'), { 
  ssr: false,
  loading: () => <div className="h-[400px] w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl" />
});

// 🌟 Component สร้างแท่งสัญญาณมือถือ 4 ขีด
function SignalBars({ csq }: { csq: number }) {
  let bars = 0;
  if (csq > 20 && csq !== 99) bars = 4;      // Excellent
  else if (csq > 14) bars = 3;               // Good
  else if (csq > 9) bars = 2;                // Fair
  else if (csq > 0 && csq !== 99) bars = 1;  // Poor

  return (
    <div className="flex items-end gap-[3px] h-5" title={`CSQ: ${csq}`}>
      {[1, 2, 3, 4].map((bar) => (
        <div
          key={bar}
          className={`w-1.5 rounded-sm transition-colors ${bar <= bars ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`}
          style={{ height: `${bar * 25}%` }}
        />
      ))}
    </div>
  );
}

export default function Home() {
  const [logs, setLogs] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDeviceMac, setSelectedDeviceMac] = useState<string>('ALL');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [timeframe, setTimeframe] = useState('day');
  const [logTab, setLogTab] = useState<'ALL' | 'ALERTS'>('ALL');
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

  // ✅ สูตรคำนวณระดับน้ำ 
  const calculateWater = useCallback((level: any) => {
    const raw = Number(level ?? 84.0); 
    let val = (84.0 - raw) - 5.0; 
    if (raw <= 0.5 || raw > 90) val = 0; 
    return val < 0 ? 0 : (val > 40 ? 40 : val); 
  }, []);

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

    return { water: sum.water / activeLogs.length, temp: sum.temp / activeLogs.length, humid: sum.humid / activeLogs.length };
  };

  const { water: waterInTank, temp: currentTemp, humid: currentHumid } = getMetrics();

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

  const trends = { water: getTrend(waterInTank, 'level'), temp: getTrend(currentTemp, 'temp'), humid: getTrend(currentHumid, 'humid') };

  // 🌟 อัปเดตเกณฑ์แจ้งเตือน (แดง >= 20, ส้ม >= 10)
  const status = waterInTank >= 20 ? { label: "CRITICAL", color: "text-red-500", bg: "bg-red-500", icon: <ShieldAlert size={20}/>, border: "border-red-500/30" }
               : waterInTank >= 10 ? { label: "WARNING", color: "text-orange-500", bg: "bg-orange-500", icon: <AlertTriangle size={20}/>, border: "border-orange-500/30" }
               : { label: "STABLE", color: "text-emerald-500", bg: "bg-emerald-500", icon: <CheckCircle2 size={20}/>, border: "border-emerald-500/30" };

  // 🌟 คำนวณข้อมูลสรุป (Insights) และ Rate of Change
  const insights = useMemo(() => {
    const filteredLogs = selectedDeviceMac === 'ALL' ? logs : logs.filter(l => (l.mac || l.device_id) === selectedDeviceMac);
    if (!filteredLogs.length) return { maxWater: 0, avgSignal: 0, total: 0, lastUpdate: 'N/A', rateOfChange: '0.0' };
    
    const minRawDist = Math.min(...filteredLogs.map(l => Number(l.level || 84.0)));
    const maxW = calculateWater(minRawDist);
    
    const validSignals = filteredLogs.filter(l => Number(l.signal) !== 99 && Number(l.signal) > 0);
    const avgSig = validSignals.length > 0 ? validSignals.reduce((acc, l) => acc + Number(l.signal), 0) / validSignals.length : 0;
    
    const latestLog = filteredLogs[filteredLogs.length - 1];
    const updateTime = latestLog?.timestamp ? new Date(latestLog.timestamp).toLocaleTimeString('th-TH') : 'Just now';

    let rateStr = "0.0";
    if (filteredLogs.length >= 2) {
      const oneHourAgoTime = new Date(latestLog.timestamp).getTime() - 3600000;
      const oldLog = filteredLogs.find(l => new Date(l.timestamp).getTime() >= oneHourAgoTime) || filteredLogs[0];
      
      const timeDiffHours = (new Date(latestLog.timestamp).getTime() - new Date(oldLog.timestamp).getTime()) / 3600000;
      if (timeDiffHours > 0) {
        const rate = (calculateWater(latestLog.level) - calculateWater(oldLog.level)) / timeDiffHours;
        rateStr = (rate > 0 ? "+" : "") + rate.toFixed(1);
      }
    }

    return { maxWater: maxW, avgSignal: avgSig, total: filteredLogs.length, lastUpdate: updateTime, rateOfChange: rateStr };
  }, [logs, selectedDeviceMac, calculateWater]);

  // 🌟 ฟิลเตอร์ Log สำหรับตารางแยกตามแท็บ
  const displayLogs = useMemo(() => {
    let l = logs.filter(l => selectedDeviceMac === 'ALL' || (l.mac || l.device_id) === selectedDeviceMac);
    if (logTab === 'ALERTS') {
      l = l.filter(log => calculateWater(log.level) >= 10);
    }
    return l;
  }, [logs, selectedDeviceMac, logTab, calculateWater]);

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] transition-colors duration-500 pb-10 font-sans print:bg-white">
      
      <header className="sticky top-0 z-[100] bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-3 shadow-sm print:hidden">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-600 rounded-xl text-white"><Waves size={20}/></div>
            <div className="relative">
              <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                <Server size={14} className="text-blue-500" />
                {selectedDeviceMac === 'ALL' ? 'System Average' : devices.find(d => d.mac === selectedDeviceMac)?.name || 'Device'}
                <ChevronDown size={14} className={isDropdownOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-900 shadow-xl rounded-xl border border-slate-200 dark:border-slate-800 p-1 animate-in fade-in zoom-in-95">
                  <button onClick={() => { setSelectedDeviceMac('ALL'); setIsDropdownOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-[11px] font-bold uppercase transition-colors">🌍 System Average</button>
                  {devices.map((d: any) => (
                    <button key={d.mac} onClick={() => { setSelectedDeviceMac(d.mac); setIsDropdownOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-[11px] font-bold uppercase transition-all">
                      <Radio size={12} className="text-slate-400" /> {d.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <Clock size={14} /> Last sync: {insights.lastUpdate}
            </div>
            <div className="h-5 w-px bg-slate-200 dark:bg-slate-800"></div>
            
            <button 
              onClick={() => window.print()} 
              className="flex items-center gap-2 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg"
              title="Save Dashboard as PDF"
            >
              <FileText size={16} />
              <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Export PDF</span>
            </button>
            
            <button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} className="text-slate-500 hover:text-blue-500 transition-colors"><Sun size={18}/></button>
            <Link href="/admin" className="text-slate-500 hover:text-blue-500 transition-colors"><Settings size={18} /></Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-4 sm:p-6 space-y-6 print:p-0 print:space-y-4">
        
        <div className="hidden print:block mb-4 border-b pb-4">
          <h1 className="text-2xl font-black text-slate-800">Flood Monitoring System Report</h1>
          <p className="text-sm text-slate-500">Report generated on: {new Date().toLocaleString('th-TH')}</p>
          <p className="text-sm text-slate-500">Target Node: {selectedDeviceMac === 'ALL' ? 'System Average' : devices.find(d => d.mac === selectedDeviceMac)?.name}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Water Level" val={waterInTank.toFixed(1)} unit="CM" icon={<Waves size={18}/>} color={status.color} trend={trends.water} />
          <MetricCard label="Temperature" val={currentTemp.toFixed(1)} unit="°C" icon={<Thermometer size={18}/>} color="text-orange-500" trend={trends.temp} />
          <MetricCard label="Air Humidity" val={currentHumid.toFixed(0)} unit="%" icon={<Droplets size={18}/>} color="text-cyan-500" trend={trends.humid} />
          <div className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border flex flex-col justify-between h-32 ${status.border} shadow-sm relative overflow-hidden`}>
             <div className="flex justify-between items-start relative z-10">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">System Status</span>
                <div className={`p-1.5 rounded-lg ${status.bg} text-white shadow-sm`}>{status.icon}</div>
             </div>
             <div className="relative z-10">
               <div className={`text-xl font-black ${status.color} tracking-wider`}>{status.label}</div>
             </div>
             <div className={`absolute -bottom-4 -right-4 opacity-5 ${status.color}`}><ShieldAlert size={100} /></div>
          </div>
        </div>

        {/* 🌟 Data Insights ย้ายมาไว้ใต้ส่วนบนสุด */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <InsightCard 
             icon={<ActivitySquare size={16}/>} 
             title="Rate of Change" 
             value={insights.rateOfChange} 
             unit="CM / HR" 
             color={Number(insights.rateOfChange) > 0 ? "text-orange-500" : "text-emerald-500"} 
           />
           <InsightCard 
             icon={<TrendingUp size={16}/>} 
             title="Highest Level" 
             value={insights.maxWater.toFixed(1)} 
             unit="CM" 
             color="text-blue-500" 
           />
           <InsightCard 
             icon={<Signal size={16}/>} 
             title="Network Signal" 
             customValue={<div className="flex items-center gap-3"><SignalBars csq={insights.avgSignal} /> <span className="text-[10px] font-bold text-slate-400 uppercase">({insights.avgSignal.toFixed(0)} CSQ)</span></div>}
             color="text-indigo-500" 
           />
           <InsightCard 
             icon={<History size={16}/>} 
             title="Total Data Points" 
             value={insights.total} 
             unit="Logs" 
             color="text-amber-500" 
           />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col min-h-[450px]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-slate-700 dark:text-slate-300"><Activity size={16} className="text-blue-500" /> Trend Analytics</h3>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                {['day', 'week', 'month'].map(tf => (
                  <button key={tf} onClick={() => setTimeframe(tf)} className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${timeframe === tf ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>{tf}</button>
                ))}
              </div>
            </div>
            <div className="flex-grow">
              <WaterLevelChart data={logs.filter(l => selectedDeviceMac === 'ALL' || (l.mac || l.device_id) === selectedDeviceMac)} timeframe={timeframe} isDark={resolvedTheme === 'dark'} devices={devices} selectedDeviceMac={selectedDeviceMac} />
            </div>
          </div>
          <div className="lg:col-span-4 flex flex-col gap-6">
            <WaterTank level={waterInTank} />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
             <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex items-center gap-2">
                <MapIcon size={16} className="text-slate-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Node Locations</h3>
             </div>
             <div className="flex-grow p-4">
                <div className="h-[350px] w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative z-0">
                   <DeviceMap devices={devices.filter(d => selectedDeviceMac === 'ALL' || d.mac === selectedDeviceMac)} />
                </div>
             </div>
          </div>
          
          <div className="xl:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[435px]">
             <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database size={16} className="text-indigo-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">History</h3>
                </div>
                <div className="flex bg-slate-200/50 dark:bg-slate-800 p-1 rounded-lg">
                  <button onClick={() => setLogTab('ALL')} className={`px-3 py-1.5 text-[9px] font-bold uppercase rounded-md transition-all ${logTab === 'ALL' ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>All Logs</button>
                  <button onClick={() => setLogTab('ALERTS')} className={`px-3 py-1.5 text-[9px] font-bold uppercase rounded-md transition-all flex items-center gap-1 ${logTab === 'ALERTS' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-500'}`}>
                    Alerts <span className="bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300 px-1 rounded-full text-[8px]">{logs.filter(l => calculateWater(l.level) >= 10).length}</span>
                  </button>
                </div>
             </div>
             <div className="flex-grow overflow-hidden relative">
                {displayLogs.length === 0 && logTab === 'ALERTS' ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                    <CheckCircle2 size={32} className="mb-2 text-emerald-500 opacity-50" />
                    <p className="text-xs font-bold uppercase tracking-wider">No Alerts Recorded</p>
                  </div>
                ) : (
                  <RecentLogs logs={displayLogs} />
                )}
             </div>
          </div>
        </div>

      </main>
    </div>
  );
}

function MetricCard({ label, val, unit, icon, color, trend }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-32 group hover:border-blue-200 dark:hover:border-slate-700 transition-all">
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        <div className={`p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 ${color}`}>{icon}</div>
      </div>
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-2xl font-black ${color} tracking-tight`}>{val}</span>
          <span className="text-[10px] font-bold text-slate-400 tracking-wider">{unit}</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          {trend.direction === 'up' && <span className="flex items-center gap-0.5 text-red-500 text-[10px] font-bold"><TrendingUp size={12} /> +{trend.diff.toFixed(1)}</span>}
          {trend.direction === 'down' && <span className="flex items-center gap-0.5 text-emerald-500 text-[10px] font-bold"><TrendingDown size={12} /> -{trend.diff.toFixed(1)}</span>}
          {trend.direction === 'neutral' && <span className="flex items-center gap-0.5 text-slate-400 text-[10px] font-bold"><Minus size={12} /> 0.0</span>}
        </div>
      </div>
    </div>
  );
}

function InsightCard({ icon, title, value, unit, color, customValue }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-full bg-slate-50 dark:bg-slate-800 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{title}</p>
        {customValue ? (
          customValue
        ) : (
          <p className={`text-lg font-black ${color}`}>
            {value} <span className="text-[10px] font-bold text-slate-400 uppercase">{unit}</span>
          </p>
        )}
      </div>
    </div>
  );
}