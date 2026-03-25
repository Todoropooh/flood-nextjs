'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation'; 


// 🌟 Import Components
import WaterLevelChart from '@/components/WaterLevelChart';
import WaterTank from '@/components/WaterTank'; 
import RecentLogs from '@/components/RecentLogs'; 

import { 
  Activity, CheckCircle2, ShieldAlert, AlertTriangle, 
  Database, Clock, Signal, Zap, Loader2, Download,
  Cloud, CloudRain, CloudLightning, Sun, MapPin,
  ArrowUpRight, ArrowDownRight, Minus, Wifi, WifiOff, Wind
} from 'lucide-react';

const DeviceMap = dynamic(() => import('@/components/DeviceMap'), { 
  ssr: false,
  loading: () => <div className="h-[450px] w-full bg-white/40 dark:bg-black/40 backdrop-blur-md animate-pulse rounded-[2.5rem] flex items-center justify-center text-slate-500 font-bold tracking-widest text-xs uppercase">Loading Map Data...</div>
});

export default function Home() {
  const { data: session, status } = useSession(); 
  const router = useRouter(); 

  const [logs, setLogs] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDeviceMac] = useState<string>('ALL'); 
  const [isMounted, setIsMounted] = useState(false);
  const [timeframe, setTimeframe] = useState('day');
  const { resolvedTheme } = useTheme();
  const [weather, setWeather] = useState<any>(null);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login'); 
    }
  }, [status, router]);

  const fetchWeather = async () => {
    try {
      const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=14.8824&longitude=103.4936&current_weather=true');
      const data = await res.json();
      setWeather(data.current_weather);
    } catch (error) { console.error("Error fetching weather:", error); }
  };

  const fetchData = useCallback(async () => {
    if (status !== 'authenticated') return; 
    
    try {
      const t = Date.now();
      // 🌟 ใส่ cache: 'no-store' และแก้เป็น /api/settings ให้ตรงกับ Backend ที่เราทำไว้
      const [logRes, devRes] = await Promise.all([
        fetch(`/api/flood?timeframe=${timeframe}&t=${t}`, { cache: 'no-store' }),
        fetch(`/api/settings?t=${t}`, { cache: 'no-store' }) 
      ]);
      if (logRes.ok && devRes.ok) {
        setLogs(await logRes.json() || []);
        setDevices(await devRes.json() || []);
      }
    } catch (err) { console.error("Fetch error:", err); }
  }, [timeframe, status]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData(); 
      fetchWeather();
      const dataInterval = setInterval(fetchData, 5000); 
      const weatherInterval = setInterval(fetchWeather, 30 * 60000); 
      return () => { clearInterval(dataInterval); clearInterval(weatherInterval); };
    }
  }, [fetchData, status]);

  // 🌟 เลิกลบซ้ำ! คืนค่าระดับน้ำตรงๆ เพราะ API จัดการมาให้แล้ว
  const calculateWater = useCallback((level: any, installHeight: number = 13.5) => {
    const raw = Number(level);
    if (isNaN(raw) || raw <= 0) return 0;
    if (raw > installHeight) return installHeight;
    return raw; 
  }, []);

  const activeLogs = useMemo(() => {
    if (!Array.isArray(logs) || logs.length === 0) return [];
    return selectedDeviceMac === 'ALL' ? logs : logs.filter(l => (l.mac || l.device_id) === selectedDeviceMac);
  }, [logs, selectedDeviceMac]);

  const isOffline = useMemo(() => {
    if (activeLogs.length === 0) return true;
    const lastLogTime = new Date(activeLogs[activeLogs.length - 1].createdAt || activeLogs[activeLogs.length - 1].timestamp).getTime();
    return (Date.now() - lastLogTime) > 15 * 60 * 1000; 
  }, [activeLogs]);

  const waterInTank = useMemo(() => {
    if (activeLogs.length === 0) return 0;
    const lastEntry = activeLogs[activeLogs.length - 1];
    const device = devices.find(d => d.mac === (lastEntry.mac || lastEntry.device_id));
    return calculateWater(lastEntry?.level, device?.installHeight ?? 13.5);
  }, [activeLogs, calculateWater, devices]);

  const activeThresholds = useMemo(() => {
    let d = devices.find(d => d.mac === selectedDeviceMac);
    if (selectedDeviceMac === 'ALL' && activeLogs.length > 0) {
      d = devices.find(dev => dev.mac === (activeLogs[activeLogs.length - 1].mac || activeLogs[activeLogs.length - 1].device_id));
    }
    return { warning: d?.warningThreshold ?? 2.8, critical: d?.criticalThreshold ?? 3.0, installHeight: d?.installHeight ?? 13.5 };
  }, [selectedDeviceMac, devices, activeLogs]);

  const systemStatus = useMemo(() => {
    if (activeLogs.length === 0) return { label: "NO DATA", state: "offline", color: "text-slate-400", bg: "bg-white/40 dark:bg-black/40 backdrop-blur-md", icon: <WifiOff size={32} className="text-slate-500"/>, border: "border-white/30 dark:border-white/10" };
    const tolerance = 0.05; 
    if (waterInTank >= (activeThresholds.critical - tolerance)) return { label: "DANGER", state: "danger", color: "text-red-600 dark:text-red-500", bg: "bg-red-500/80 backdrop-blur-md", icon: <ShieldAlert size={32} className="text-white"/>, border: "border-red-500/50" };
    if (waterInTank >= (activeThresholds.warning - tolerance)) return { label: "WARNING", state: "warning", color: "text-orange-600 dark:text-orange-500", bg: "bg-orange-500/80 backdrop-blur-md", icon: <AlertTriangle size={32} className="text-white"/>, border: "border-orange-500/50" };
    return { label: "STABLE", state: "safe", color: "text-emerald-600 dark:text-emerald-500", bg: "bg-emerald-500/80 backdrop-blur-md", icon: <CheckCircle2 size={32} className="text-white"/>, border: "border-emerald-500/50" };
  }, [waterInTank, activeThresholds, activeLogs.length]);

  const insights = useMemo(() => {
    if (activeLogs.length < 2) return { maxWater: 0, avgSignal: 0, rateOfChange: 0, timeToFlood: '-', lastUpdate: '-', percentToCritical: 0 };
    try {
      const latestLog = activeLogs[activeLogs.length - 1];
      const h = activeThresholds.installHeight;
      const crit = activeThresholds.critical;
      const currentWater = calculateWater(latestLog.level, h);
      const maxWater = Math.max(...activeLogs.map(l => calculateWater(l.level, h)));
      const latestTime = new Date(latestLog?.createdAt || Date.now()).getTime();
      const thirtyMinsAgo = latestTime - (30 * 60000);
      const oldLog = activeLogs.find(l => new Date(l.createdAt).getTime() >= thirtyMinsAgo) || activeLogs[0];
      const hourDiff = (latestTime - new Date(oldLog.createdAt).getTime()) / 3600000;
      const rate = hourDiff > 0 ? (currentWater - calculateWater(oldLog.level, h)) / hourDiff : 0;

      let timeStr = "Stable";
      if (rate > 0.05 && currentWater < crit) {
        const mins = Math.round(((crit - currentWater) / rate) * 60);
        timeStr = mins > 60 ? `Risk in ${Math.floor(mins/60)}h ${mins%60}m` : `Risk in ${mins}m`;
      } else if (currentWater >= (crit - 0.05)) {
        timeStr = "Critical Now";
      }

      return { 
        maxWater: Math.max(maxWater, 0), 
        avgSignal: latestLog?.signal === 99 ? 0 : (latestLog?.signal || 0), 
        rateOfChange: rate, 
        timeToFlood: timeStr, 
        lastUpdate: latestLog?.createdAt ? new Date(latestLog.createdAt).toLocaleTimeString('th-TH') : 'N/A',
        percentToCritical: Math.min(100, (currentWater / crit) * 100)
      };
    } catch (e) { return { maxWater: 0, avgSignal: 0, rateOfChange: 0, timeToFlood: null, lastUpdate: 'Error', percentToCritical: 0 }; }
  }, [activeLogs, calculateWater, activeThresholds]);

  const signalStatus = useMemo(() => {
    if (activeLogs.length === 0) return { label: "No Data", icon: <WifiOff size={16}/>, color: "text-slate-400" };
    if (isOffline) return { label: "Offline", icon: <WifiOff size={16}/>, color: "text-red-500" };
    const s = insights.avgSignal;
    if (s >= 20) return { label: "Good", icon: <Wifi size={16}/>, color: "text-emerald-500" };
    if (s >= 10) return { label: "Fair", icon: <Wifi size={16}/>, color: "text-orange-500" };
    return { label: "Weak", icon: <Wifi size={16}/>, color: "text-red-500" };
  }, [insights.avgSignal, activeLogs.length, isOffline]);

  const mapDevices = useMemo(() => {
    return devices.filter(d => selectedDeviceMac === 'ALL' || d.mac === selectedDeviceMac).map(d => {
      const dLogs = logs.filter(l => (l.mac || l.device_id) === d.mac);
      if(dLogs.length === 0) return { ...d, currentLevel: 0, status: 'offline' };
      const last = dLogs[dLogs.length - 1];
      const lvl = calculateWater(last.level, d.installHeight ?? 13.5);
      let stat = 'safe';
      if(lvl >= (d.criticalThreshold ?? 3.0) - 0.05) stat = 'danger';
      else if(lvl >= (d.warningThreshold ?? 2.8) - 0.05) stat = 'warning';
      return { ...d, currentLevel: lvl, status: stat };
    });
  }, [devices, logs, selectedDeviceMac, calculateWater]);

  const exportToCSV = () => {
    if (activeLogs.length === 0) return alert("No data to export");
    const headers = ["Timestamp", "Device", "Water Level (cm)", "Signal"];
    const rows = activeLogs.map(l => [
      new Date(l.createdAt || l.timestamp).toLocaleString(),
      l.mac || l.device_id,
      calculateWater(l.level, activeThresholds.installHeight).toFixed(2),
      l.signal || 0
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "water_level_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getWeatherIcon = (code: number) => {
    if (code === 0) return { icon: <Sun size={32} className="text-amber-500" />, text: "Clear Sky" };
    if (code >= 1 && code <= 3) return { icon: <Cloud size={32} className="text-slate-400" />, text: "Partly Cloudy" };
    if (code >= 51 && code <= 65) return { icon: <CloudRain size={32} className="text-blue-500" />, text: "Rain" };
    if (code >= 95) return { icon: <CloudLightning size={32} className="text-purple-500" />, text: "Thunderstorm" };
    return { icon: <Cloud size={32} className="text-slate-400" />, text: "Normal" };
  };

  if (!isMounted || status === 'loading') return (
    <div className="flex h-screen items-center justify-center relative overflow-hidden">
      <div className="fixed inset-0 -z-10 bg-[#0f172a]">
        <img src="https://images.pexels.com/photos/1295138/pexels-photo-1295138.jpeg" className="w-full h-full object-cover opacity-100" alt="background" />
        <div className="absolute inset-0 bg-white/20 dark:bg-black/70 backdrop-blur-2xl transition-colors duration-500" />
      </div>
      <Loader2 className="animate-spin text-white drop-shadow-lg" size={40} />
    </div>
  );

  if (status === 'unauthenticated') return null;

  const isDark = resolvedTheme === 'dark';
  const weatherDetails = weather ? getWeatherIcon(weather.weathercode) : null;

  return (
    <div className="min-h-screen font-sans pb-24 md:pb-10 relative overflow-hidden transition-colors duration-300">
      
      <div className="fixed inset-0 -z-10 bg-[#0f172a]">
        <img 
          src="https://images.pexels.com/photos/1295138/pexels-photo-1295138.jpeg" 
          className="w-full h-full object-cover opacity-100"
          alt="background"
        />
        <div className="absolute inset-0 bg-slate-100/50 dark:bg-black/70 backdrop-blur-[40px] transition-colors duration-500" />
      </div>

      <main className="max-w-[1600px] mx-auto p-4 sm:p-6 space-y-6 relative z-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className={`lg:col-span-8 p-6 sm:p-8 rounded-[2.5rem] shadow-2xl flex flex-col justify-between relative overflow-hidden transition-all backdrop-blur-xl ${isDark ? 'bg-[#1C1C1E]/60 border border-white/10' : 'bg-white/60 border border-white/50'}`}>
            <div className="flex justify-between items-start relative z-10">
               <div>
                  <h2 className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest mb-2 flex items-center gap-2">
                    Live Water Level
                    {isOffline && activeLogs.length > 0 && <span className="px-2 py-0.5 rounded text-[9px] bg-red-500/20 text-red-600 dark:text-red-400 backdrop-blur-md">OFFLINE</span>}
                  </h2>
                  <div className="flex items-baseline gap-2 drop-shadow-sm">
                     <span className={`text-6xl sm:text-7xl font-black tabular-nums tracking-tighter ${activeLogs.length === 0 ? 'text-slate-400/50' : isDark ? 'text-white' : 'text-slate-800'}`}>
                       {activeLogs.length > 0 ? waterInTank.toFixed(2) : '-.--'}
                     </span>
                     <span className="text-xl sm:text-2xl font-bold text-slate-500 dark:text-slate-400">cm</span>
                  </div>
               </div>
               <div className={`flex items-center gap-2 px-4 py-2 rounded-full border shadow-sm ${systemStatus.bg} ${systemStatus.border}`}>
                  {systemStatus.icon}
                  <span className={`font-black tracking-widest text-sm pr-1 ${activeLogs.length === 0 ? 'text-slate-500' : 'text-white drop-shadow-md'}`}>{systemStatus.label}</span>
               </div>
            </div>

            <div className={`mt-8 pt-6 border-t relative z-10 flex flex-wrap gap-6 items-center ${isDark ? 'border-white/10' : 'border-slate-300/30'}`}>
               <div className="flex items-center gap-2">
                 <div className={`flex items-center justify-center w-8 h-8 rounded-full shadow-sm backdrop-blur-md ${activeLogs.length === 0 ? 'bg-white/40 dark:bg-black/40 text-slate-400' : insights.rateOfChange > 0.05 ? 'bg-red-500/20 text-red-600 dark:text-red-400' : insights.rateOfChange < -0.05 ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-white/40 dark:bg-black/40 text-slate-500 dark:text-slate-300'}`}>
                   {insights.rateOfChange > 0.05 ? <ArrowUpRight size={18}/> : insights.rateOfChange < -0.05 ? <ArrowDownRight size={18}/> : <Minus size={18}/>}
                 </div>
                 <div>
                   <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase drop-shadow-sm">Trend</p>
                   <p className={`text-sm font-black drop-shadow-sm ${activeLogs.length === 0 ? 'text-slate-400' : isDark?'text-slate-200':'text-slate-800'}`}>
                     {activeLogs.length === 0 ? '-' : `${insights.rateOfChange > 0 ? '+' : ''}${insights.rateOfChange.toFixed(2)} cm/h`}
                   </p>
                 </div>
               </div>
               <div className={`w-px h-8 hidden sm:block ${isDark ? 'bg-white/10' : 'bg-slate-300/40'}`}></div>
               <div>
                 <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase drop-shadow-sm">AI Prediction</p>
                 <p className={`text-sm font-bold flex items-center gap-1.5 drop-shadow-sm ${activeLogs.length === 0 ? 'text-slate-400' : 'text-orange-500 dark:text-orange-400'}`}>
                   <Zap size={14}/> {activeLogs.length === 0 ? '-' : insights.timeToFlood}
                 </p>
               </div>
            </div>
          </div>

          <div className={`lg:col-span-4 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl flex flex-col justify-between transition-all backdrop-blur-xl ${isDark ? 'bg-[#1C1C1E]/60 border border-white/10' : 'bg-white/60 border border-white/50'}`}>
            {weather ? (
              <>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest flex items-center gap-1 drop-shadow-sm"><MapPin size={12} /> Surin</h3>
                    <p className={`text-sm font-bold mt-1 drop-shadow-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{weatherDetails?.text}</p>
                  </div>
                  <div className={`p-2 rounded-2xl shadow-sm backdrop-blur-md ${isDark ? 'bg-black/40 border border-white/5' : 'bg-white/60 border border-white/50'}`}>{weatherDetails?.icon}</div>
                </div>
                <div className="mt-6">
                  <div className="flex items-end gap-1 mb-4 drop-shadow-sm">
                    <span className={`text-5xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-slate-800'}`}>{weather.temperature}</span>
                    <span className="text-xl font-bold text-slate-500 dark:text-slate-400 pb-1">°C</span>
                  </div>
                </div>
              </>
            ) : <Loader2 className="animate-spin m-auto text-slate-400" />}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
           <StatCard icon={<Activity />} label="Highest" value={activeLogs.length > 0 ? insights.maxWater.toFixed(2) : '-'} unit="cm" isDark={isDark} />
           <StatCard icon={signalStatus.icon} label="Signal Status" value={signalStatus.label} valueColor={signalStatus.color} isDark={isDark} />
           <StatCard icon={<Database />} label="Records" value={activeLogs.length} unit="logs" isDark={isDark} />
           <StatCard icon={<Clock />} label="Update" value={insights.lastUpdate} isDark={isDark} />
        </div>

        <div className={`p-6 rounded-[2.5rem] shadow-2xl backdrop-blur-xl transition-all ${isDark ? 'bg-[#1C1C1E]/60 border border-white/10' : 'bg-white/60 border border-white/50'}`}>
           <div className="flex justify-between items-center mb-6">
             <h3 className="font-bold text-sm uppercase tracking-widest text-slate-600 dark:text-slate-300 drop-shadow-sm">History</h3>
             <div className={`flex p-1 rounded-xl shadow-inner backdrop-blur-md ${isDark ? 'bg-black/40 border border-white/5' : 'bg-slate-200/50 border border-white/40'}`}>
               {['day', 'week', 'month'].map(t => (
                 <button key={t} onClick={() => setTimeframe(t)} className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all ${timeframe === t ? (isDark ? 'bg-blue-600/80 text-white shadow-md' : 'bg-white shadow-md text-blue-600') : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                   {t.toUpperCase()}
                 </button>
               ))}
             </div>
           </div>
           <div className="h-[350px]">
              <WaterLevelChart data={activeLogs} isDark={isDark} devices={devices} timeframe={timeframe} selectedDeviceMac={selectedDeviceMac} />
           </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
           <div className={`xl:col-span-7 h-[500px] rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-xl transition-all ${isDark ? 'border border-white/10' : 'border border-white/50'}`}>
              <DeviceMap devices={mapDevices} />
           </div>

           <div className={`xl:col-span-5 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[500px] backdrop-blur-xl transition-all ${isDark ? 'bg-[#1C1C1E]/60 border border-white/10' : 'bg-white/60 border border-white/50'}`}>
              <div className={`p-5 border-b flex justify-between items-center backdrop-blur-md ${isDark ? 'border-white/10 bg-black/20' : 'border-slate-300/30 bg-white/40'}`}>
                 <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800 dark:text-white drop-shadow-sm">System Logs</h3>
                 <button onClick={exportToCSV} className="p-2 bg-blue-600/90 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all backdrop-blur-md"><Download size={14}/></button>
              </div>
              <div className="flex-grow overflow-auto p-2">
                 <RecentLogs logs={activeLogs} devices={devices} />
              </div>
           </div>
        </div>

      </main>
    </div>
  );
}

function StatCard({ icon, label, value, unit, isDark, valueColor }: any) {
  return (
    <div className={`p-6 rounded-[2.5rem] shadow-2xl transition-all backdrop-blur-xl ${isDark ? 'bg-[#1C1C1E]/60 border border-white/10' : 'bg-white/60 border border-white/50'}`}>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-sm backdrop-blur-md ${isDark ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' : 'bg-white/80 text-[#1155FA] border border-white'}`}>{icon}</div>
      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest drop-shadow-sm">{label}</div>
      <div className={`text-2xl font-black mt-1 tabular-nums tracking-tight drop-shadow-sm ${valueColor ? valueColor : isDark ? 'text-white' : 'text-slate-800'}`}>
        {value} <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium ml-0.5">{unit}</span>
      </div>
    </div>
  );
}