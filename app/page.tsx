'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { signOut, useSession } from 'next-auth/react';

// 🌟 Import Components
import LoginScreen from '@/components/LoginScreen'; 
import WaterLevelChart from '@/components/WaterLevelChart';
import WaterTank from '@/components/WaterTank'; 
import RecentLogs from '@/components/RecentLogs'; 

import { 
  Waves, Sun, Activity, ChevronDown, Settings, 
  Radio, Server, CheckCircle2, ShieldAlert, AlertTriangle, TrendingUp, 
  Database, Clock, Signal, ActivitySquare, Zap, Loader2, Download,
  LogOut, Cloud, CloudRain, CloudLightning, Wind, MapPin,
  ArrowUpRight, ArrowDownRight, Minus, Wifi, WifiOff
} from 'lucide-react';

const DeviceMap = dynamic(() => import('@/components/DeviceMap'), { 
  ssr: false,
  loading: () => <div className="h-[450px] w-full bg-slate-100 dark:bg-slate-800/50 animate-pulse rounded-3xl flex items-center justify-center text-slate-400 font-bold tracking-widest text-xs uppercase">Loading Map Data...</div>
});

export default function Home() {
  const { data: session, status } = useSession(); 

  const [logs, setLogs] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDeviceMac, setSelectedDeviceMac] = useState<string>('ALL');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // 🌟 Timeframe State (day, week, month)
  const [timeframe, setTimeframe] = useState('day');
  const { setTheme, resolvedTheme } = useTheme();
  const [weather, setWeather] = useState<any>(null);

  useEffect(() => { setIsMounted(true); }, []);

  const handleLogout = () => signOut({ redirect: false }); 

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
      const [logRes, devRes] = await Promise.all([
        fetch(`/api/flood?timeframe=${timeframe}&t=${t}`),
        fetch(`/api/devices?t=${t}`)
      ]);
      if (logRes.ok && devRes.ok) {
        setLogs(await logRes.json() || []);
        setDevices(await devRes.json() || []);
      }
    } catch (err) { console.error("Fetch error:", err); }
  }, [timeframe, status]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData(); fetchWeather();
      const dataInterval = setInterval(fetchData, 5000); 
      const weatherInterval = setInterval(fetchWeather, 30 * 60000); 
      return () => { clearInterval(dataInterval); clearInterval(weatherInterval); };
    }
  }, [fetchData, status]);

  const calculateWater = useCallback((level: any, installHeight: number = 13.5) => {
    const raw = Number(level);
    if (isNaN(raw) || raw <= 0) return 0;
    if (raw >= (installHeight - 0.1)) return 0;
    let val = (installHeight - raw);
    if (val > installHeight) val = installHeight;
    if (val < 0) val = 0;
    return val;
  }, []);

  const activeLogs = useMemo(() => {
    if (!Array.isArray(logs) || logs.length === 0) return [];
    return selectedDeviceMac === 'ALL' ? logs : logs.filter(l => (l.mac || l.device_id) === selectedDeviceMac);
  }, [logs, selectedDeviceMac]);

  // 🌟 ตรวจสอบว่า Device Offline หรือไม่มีข้อมูลหรือไม่ (ออฟไลน์ถ้าข้อมูลล่าสุดเกิน 15 นาที)
  const isOffline = useMemo(() => {
    if (activeLogs.length === 0) return true;
    const lastLogTime = new Date(activeLogs[activeLogs.length - 1].createdAt || activeLogs[activeLogs.length - 1].timestamp).getTime();
    return (Date.now() - lastLogTime) > 15 * 60 * 1000; // 15 นาที
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

  // 🌟 ปรับ System Status ให้รองรับสถานะ NO DATA / OFFLINE
  const systemStatus = useMemo(() => {
    if (activeLogs.length === 0) return { label: "NO DATA", state: "offline", color: "text-slate-400", bg: "bg-slate-200 dark:bg-slate-800", icon: <WifiOff size={32} className="text-slate-500"/>, border: "border-slate-300 dark:border-slate-700" };
    
    const tolerance = 0.05; 
    if (waterInTank >= (activeThresholds.critical - tolerance)) return { label: "DANGER", state: "danger", color: "text-red-600 dark:text-red-500", bg: "bg-red-500", icon: <ShieldAlert size={32} className="text-white"/>, border: "border-red-500" };
    if (waterInTank >= (activeThresholds.warning - tolerance)) return { label: "WARNING", state: "warning", color: "text-orange-600 dark:text-orange-500", bg: "bg-orange-500", icon: <AlertTriangle size={32} className="text-white"/>, border: "border-orange-500" };
    return { label: "STABLE", state: "safe", color: "text-emerald-600 dark:text-emerald-500", bg: "bg-emerald-500", icon: <CheckCircle2 size={32} className="text-white"/>, border: "border-emerald-500" };
  }, [waterInTank, activeThresholds, activeLogs.length]);

  const insights = useMemo(() => {
    if (activeLogs.length < 2) return { maxWater: 0, avgSignal: 0, rateOfChange: 0, timeToFlood: '-', lastUpdate: '-', percentToCritical: 0 };
    try {
      const latestLog = activeLogs[activeLogs.length - 1];
      const h = activeThresholds.installHeight;
      const crit = activeThresholds.critical;
      const currentWater = calculateWater(latestLog.level, h);

      // หาค่าสูงสุด
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

  // 🌟 UX: แปลงค่า Signal เป็นคำที่เข้าใจง่าย และแสดง OFFLINE ถ้าขาดการติดต่อ
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
      if(dLogs.length === 0) return { ...d, currentLevel: 0, status: 'offline' }; // 🌟 เพิ่มสถานะ offline ใน map
      const last = dLogs[dLogs.length - 1];
      const lvl = calculateWater(last.level, d.installHeight ?? 13.5);
      let stat = 'safe';
      if(lvl >= (d.criticalThreshold ?? 3.0) - 0.05) stat = 'danger';
      else if(lvl >= (d.warningThreshold ?? 2.8) - 0.05) stat = 'warning';
      return { ...d, currentLevel: lvl, status: stat };
    });
  }, [devices, logs, selectedDeviceMac, calculateWater]);

  const exportToCSV = () => { /* ฟังก์ชันส่งออก CSV */ };

  const getWeatherIcon = (code: number) => {
    if (code === 0) return { icon: <Sun size={32} className="text-amber-500" />, text: "Clear Sky" };
    if (code >= 1 && code <= 3) return { icon: <Cloud size={32} className="text-slate-400" />, text: "Partly Cloudy" };
    if (code >= 51 && code <= 65) return { icon: <CloudRain size={32} className="text-blue-500" />, text: "Rain" };
    if (code >= 95) return { icon: <CloudLightning size={32} className="text-purple-500" />, text: "Thunderstorm" };
    return { icon: <Cloud size={32} className="text-slate-400" />, text: "Normal" };
  };

  if (!isMounted || status === 'loading') return <div className="flex h-screen items-center justify-center bg-[#F8FAFC] dark:bg-[#0B1121]"><Loader2 className="animate-spin text-[#1155FA]" size={40} /></div>;
  if (status === 'unauthenticated') return <LoginScreen />;

  const userRole = (session?.user as any)?.role || 'user';
  const isDark = resolvedTheme === 'dark';
  const weatherDetails = weather ? getWeatherIcon(weather.weathercode) : null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1121] font-sans pb-10 transition-colors duration-300">
      
      <header className="sticky top-0 z-[100] bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 shadow-sm print:hidden">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 bg-[#1155FA] rounded-lg text-white shadow-sm flex-shrink-0">
              <Waves size={18}/>
            </div>
            <div className="hidden sm:block leading-none">
              <h1 className="font-black text-base text-slate-800 dark:text-white tracking-tight">Flood Monitor</h1>
            </div>

            <div className="relative ml-1 sm:ml-4">
              <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors">
                <Server size={14} className="text-[#1155FA] hidden sm:block" />
                <span className="truncate max-w-[120px]">{selectedDeviceMac === 'ALL' ? 'All Devices' : devices.find(d => d.mac === selectedDeviceMac)?.name || 'Device'}</span>
                <ChevronDown size={14} className={isDropdownOpen ? 'rotate-180' : ''} />
              </button>
              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-900 shadow-xl rounded-xl border border-slate-200 dark:border-slate-800 p-2 z-[110]">
                  <button onClick={() => { setSelectedDeviceMac('ALL'); setIsDropdownOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold uppercase hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-700 dark:text-white transition-colors">🌍 All Devices</button>
                  {devices.map((d: any) => (
                    <button key={d.mac} onClick={() => { setSelectedDeviceMac(d.mac); setIsDropdownOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold uppercase text-left mt-1 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors">
                      <Radio size={14} className="text-slate-400 flex-shrink-0" /> <span className="truncate">{d.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
             <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
               <Sun size={16}/>
             </button>
             {userRole === 'admin' && (
               <Link href="/admin" className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-[#1155FA] transition-colors">
                 <Settings size={16} />
               </Link>
             )}
             <button onClick={handleLogout} className="p-2 rounded-lg border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
               <LogOut size={16} />
             </button>
          </div>

        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-4 sm:p-6 space-y-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div className={`lg:col-span-8 p-6 sm:p-8 rounded-3xl border shadow-sm flex flex-col justify-between relative overflow-hidden transition-colors ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="flex justify-between items-start relative z-10">
               <div>
                  <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    Live Water Level
                    {isOffline && activeLogs.length > 0 && <span className="px-2 py-0.5 rounded text-[9px] bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">OFFLINE</span>}
                  </h2>
                  <div className="flex items-baseline gap-2">
                     <span className={`text-6xl sm:text-7xl font-black tabular-nums tracking-tighter ${activeLogs.length === 0 ? 'text-slate-300 dark:text-slate-700' : isDark ? 'text-white' : 'text-slate-800'}`}>
                       {activeLogs.length > 0 ? waterInTank.toFixed(2) : '-.--'}
                     </span>
                     <span className="text-xl sm:text-2xl font-bold text-slate-400">cm</span>
                  </div>
               </div>
               
               <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${systemStatus.bg} ${systemStatus.border}`}>
                  {systemStatus.icon}
                  <span className={`font-black tracking-widest text-sm pr-1 ${activeLogs.length === 0 ? 'text-slate-500' : 'text-white'}`}>{systemStatus.label}</span>
               </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 relative z-10 flex flex-wrap gap-6 items-center">
               <div className="flex items-center gap-2">
                 <div className={`flex items-center justify-center w-8 h-8 rounded-full ${activeLogs.length === 0 ? 'bg-slate-100 text-slate-300' : insights.rateOfChange > 0.05 ? 'bg-red-100 text-red-500' : insights.rateOfChange < -0.05 ? 'bg-emerald-100 text-emerald-500' : 'bg-slate-100 text-slate-500'}`}>
                   {insights.rateOfChange > 0.05 ? <ArrowUpRight size={18}/> : insights.rateOfChange < -0.05 ? <ArrowDownRight size={18}/> : <Minus size={18}/>}
                 </div>
                 <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase">Trend</p>
                   <p className={`text-sm font-black ${activeLogs.length === 0 ? 'text-slate-400' : isDark?'text-slate-200':'text-slate-700'}`}>
                     {activeLogs.length === 0 ? '-' : `${insights.rateOfChange > 0 ? '+' : ''}${insights.rateOfChange.toFixed(2)} cm/h`}
                     <span className="text-xs ml-1 font-medium text-slate-500">
                       ({activeLogs.length === 0 ? 'No Data' : insights.rateOfChange > 0.05 ? 'Rising' : insights.rateOfChange < -0.05 ? 'Falling' : 'Stable'})
                     </span>
                   </p>
                 </div>
               </div>
               
               <div className="w-px h-8 bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
               
               <div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase">AI Prediction</p>
                 <p className={`text-sm font-bold flex items-center gap-1.5 ${activeLogs.length === 0 ? 'text-slate-400' : insights.rateOfChange > 0.1 ? 'text-orange-500' : isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                   <Zap size={14} className={activeLogs.length === 0 ? 'text-slate-300' : insights.rateOfChange > 0.1 ? 'text-orange-500' : 'text-slate-400'}/> {activeLogs.length === 0 ? '-' : insights.timeToFlood}
                 </p>
               </div>
            </div>
          </div>

          <div className={`lg:col-span-4 rounded-3xl p-6 sm:p-8 border shadow-sm flex flex-col justify-between transition-colors ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            {weather ? (
              <>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                      <MapPin size={12} /> Surin
                    </h3>
                    <p className={`text-sm font-bold mt-1 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{weatherDetails?.text}</p>
                  </div>
                  <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    {weatherDetails?.icon}
                  </div>
                </div>
                <div className="mt-6">
                  <div className="flex items-end gap-1 mb-4">
                    <span className={`text-5xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-slate-800'}`}>{weather.temperature}</span>
                    <span className="text-xl font-bold text-slate-400 pb-1">°C</span>
                  </div>
                  <div className="flex items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Wind size={14} className="text-blue-500" />
                      <div>
                        <p className="text-[9px] uppercase font-bold text-slate-400">Wind</p>
                        <p className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{weather.windspeed} km/h</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                <Loader2 size={20} className="animate-spin text-blue-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Loading...</span>
              </div>
            )}
          </div>

        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
           <StatCard icon={<Activity />} label={`Highest (${timeframe === 'day' ? '24h' : timeframe === 'week' ? '7D' : '30D'})`} value={activeLogs.length > 0 ? insights.maxWater.toFixed(2) : '-'} unit={activeLogs.length > 0 ? "cm" : ""} isDark={isDark} />
           <StatCard icon={signalStatus.icon} label="Signal Status" value={signalStatus.label} unit="" valueColor={signalStatus.color} isDark={isDark} />
           <StatCard icon={<Database />} label="Total Records" value={activeLogs.length} unit="logs" isDark={isDark} />
           <StatCard icon={<Clock />} label="Last Sync" value={activeLogs.length > 0 ? insights.lastUpdate.split(' ')[0] : '-'} unit={activeLogs.length > 0 ? insights.lastUpdate.split(' ')[1] : ''} isDark={isDark} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className={`xl:col-span-8 p-6 sm:p-8 rounded-3xl border shadow-sm min-h-[450px] transition-colors ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
             <div className="flex justify-between items-center mb-6">
               <h3 className="font-bold text-sm uppercase tracking-widest text-slate-500">Water Level History</h3>
               
               {/* 🌟 UX: Timeframe Selector (ปุ่มเลือกเวลา 24H, 7D, 30D) */}
               <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                 {['day', 'week', 'month'].map(t => (
                   <button 
                     key={t} 
                     onClick={() => setTimeframe(t)} 
                     className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all ${timeframe === t ? 'bg-white dark:bg-slate-700 text-[#1155FA] dark:text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                   >
                     {t === 'day' ? '24H' : t === 'week' ? '7D' : '30D'}
                   </button>
                 ))}
               </div>
             </div>
             
             <div className="h-[350px]">
                {activeLogs.length === 0 ? (
                  <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                     <Signal size={32} className="text-slate-300 dark:text-slate-700 mb-3" />
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Data Available</p>
                     <p className="text-[10px] text-slate-400 mt-1">Try selecting a different time range</p>
                  </div>
                ) : (
                  <WaterLevelChart data={activeLogs} isDark={isDark} devices={devices} timeframe={timeframe} selectedDeviceMac={selectedDeviceMac} />
                )}
             </div>
          </div>
          
          <div className="xl:col-span-4 h-full">
            <div className={`h-full p-6 sm:p-8 rounded-3xl border shadow-sm flex flex-col transition-colors ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="mb-4 text-center">
                <h3 className="font-bold text-sm uppercase tracking-widest text-slate-500">Tank Capacity</h3>
                <p className={`text-xs font-medium mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Max Critical: <span className="font-bold text-red-500">{activeThresholds.critical.toFixed(1)} cm</span>
                </p>
              </div>
              <div className="flex-grow flex items-center justify-center">
                <WaterTank level={activeLogs.length > 0 ? waterInTank : 0} warningThreshold={activeThresholds.warning} criticalThreshold={activeThresholds.critical} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
           <div className={`xl:col-span-7 rounded-3xl border shadow-sm p-2 transition-colors ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="h-[500px] rounded-2xl overflow-hidden relative">
                <DeviceMap devices={mapDevices} />
              </div>
           </div>
           
           <div className={`xl:col-span-5 rounded-3xl border shadow-sm overflow-hidden flex flex-col h-[516px] transition-colors ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className={`p-5 border-b flex justify-between items-center ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'}`}>
                 <div>
                   <h3 className={`font-bold uppercase tracking-widest text-xs flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                     <Database size={14} className="text-[#1155FA]"/> System Logs
                   </h3>
                 </div>
                 <button onClick={exportToCSV} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                   <Download size={14} /> CSV
                 </button>
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
    <div className={`p-6 rounded-3xl border shadow-sm transition-all ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${isDark ? 'bg-slate-800 text-blue-400' : 'bg-blue-50 text-[#1155FA]'}`}>{icon}</div>
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</div>
      <div className={`text-2xl font-black mt-1 tabular-nums tracking-tight ${valueColor ? valueColor : isDark ? 'text-white' : 'text-slate-800'}`}>
        {value} <span className="text-[11px] text-slate-400 font-medium ml-0.5">{unit}</span>
      </div>
    </div>
  );
}