'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { signIn, signOut, useSession } from 'next-auth/react';

// Import Components แบบป้องกัน Error
import WaterLevelChart from '@/components/WaterLevelChart';
import WaterTank from '@/components/WaterTank'; 
import RecentLogs from '@/components/RecentLogs'; 

import { 
  Waves, Sun, Activity, Thermometer, Droplets, ChevronDown, Settings, 
  Radio, Server, CheckCircle2, ShieldAlert, AlertTriangle, TrendingUp, 
  Database, Clock, Signal, FileText, ActivitySquare, Zap, Loader2, Download,
  LogOut
} from 'lucide-react';

const DeviceMap = dynamic(() => import('@/components/DeviceMap'), { 
  ssr: false,
  loading: () => <div className="h-[450px] w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-[2.5rem] flex items-center justify-center text-slate-400">Loading Map...</div>
});

export default function Home() {
  const { data: session, status } = useSession(); 
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [logs, setLogs] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDeviceMac, setSelectedDeviceMac] = useState<string>('ALL');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [timeframe, setTimeframe] = useState('day');
  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => { setIsMounted(true); }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setLoginError("");

    try {
      const res = await signIn("credentials", {
        redirect: false,
        username,
        password,
      });

      if (res?.error) {
        setLoginError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      }
    } catch (err) {
      setLoginError("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    signOut({ redirect: false }); 
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
        const lData = await logRes.json();
        const dData = await devRes.json();
        setLogs(Array.isArray(lData) ? lData : []);
        setDevices(Array.isArray(dData) ? dData : []);
      }
    } catch (err) { 
      console.error("Fetch error:", err); 
    }
  }, [timeframe, status]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
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

  const waterInTank = useMemo(() => {
    if (activeLogs.length === 0) return 0;
    const lastEntry = activeLogs[activeLogs.length - 1];
    const device = devices.find(d => d.mac === (lastEntry.mac || lastEntry.device_id));
    const currentInstallHeight = device?.installHeight ?? 13.5;
    return calculateWater(lastEntry?.level, currentInstallHeight);
  }, [activeLogs, calculateWater, devices]);

  const activeThresholds = useMemo(() => {
    if (selectedDeviceMac !== 'ALL') {
      const d = devices.find(d => d.mac === selectedDeviceMac);
      return { warning: d?.warningThreshold ?? 2.8, critical: d?.criticalThreshold ?? 3.0, installHeight: d?.installHeight ?? 13.5 };
    }
    if (activeLogs.length > 0) {
      const latestLog = activeLogs[activeLogs.length - 1];
      const d = devices.find(d => d.mac === (latestLog.mac || latestLog.device_id));
      return { warning: d?.warningThreshold ?? 2.8, critical: d?.criticalThreshold ?? 3.0, installHeight: d?.installHeight ?? 13.5 };
    }
    return { warning: 2.8, critical: 3.0, installHeight: 13.5 };
  }, [selectedDeviceMac, devices, activeLogs]);

  const systemStatus = useMemo(() => {
    const tolerance = 0.05; 
    if (waterInTank >= (activeThresholds.critical - tolerance)) return { label: "CRITICAL", color: "text-red-500", bg: "bg-red-500", icon: <ShieldAlert size={24}/>, border: "border-red-500", glow: "shadow-red-500/20" };
    if (waterInTank >= (activeThresholds.warning - tolerance)) return { label: "WARNING", color: "text-orange-500", bg: "bg-orange-500", icon: <AlertTriangle size={24}/>, border: "border-orange-500", glow: "shadow-orange-500/20" };
    return { label: "STABLE", color: "text-emerald-500", bg: "bg-emerald-500", icon: <CheckCircle2 size={24}/>, border: "border-emerald-500", glow: "shadow-emerald-500/20" };
  }, [waterInTank, activeThresholds]);

  const insights = useMemo(() => {
    if (activeLogs.length < 2) return { maxWater: 0, avgSignal: 0, rateOfChange: 0, timeToFlood: null, lastUpdate: 'Waiting...', percentToCritical: 0 };
    try {
      const latestLog = activeLogs[activeLogs.length - 1];
      const device = devices.find(d => d.mac === (latestLog.mac || latestLog.device_id));
      const h = device?.installHeight ?? 13.5;
      const crit = device?.criticalThreshold ?? 3.0;
      const currentWater = calculateWater(latestLog.level, h);

      const allWater = activeLogs.map(l => calculateWater(l.level, h));
      const latestTime = new Date(latestLog?.createdAt || Date.now()).getTime();
      const thirtyMinsAgo = latestTime - (30 * 60000);
      const oldLog = activeLogs.find(l => new Date(l.createdAt).getTime() >= thirtyMinsAgo) || activeLogs[0];
      
      const hourDiff = (latestTime - new Date(oldLog.createdAt).getTime()) / 3600000;
      const rate = hourDiff > 0 ? (currentWater - calculateWater(oldLog.level, h)) / hourDiff : 0;

      let timeStr = "คงที่ (Stable)";
      if (rate > 0.05 && currentWater < crit) {
        const mins = Math.round(((crit - currentWater) / rate) * 60);
        timeStr = mins > 60 ? `ประมาณ ${Math.floor(mins/60)} ชม. ${mins%60} นาที` : `${mins} นาที`;
      } else if (currentWater >= (crit - 0.05)) {
        timeStr = "วิกฤตแล้ว (Now)";
      }

      return { 
        maxWater: Math.max(...allWater, 0), avgSignal: latestLog?.signal === 99 ? 0 : (latestLog?.signal || 0), 
        rateOfChange: rate, timeToFlood: timeStr, lastUpdate: latestLog?.createdAt ? new Date(latestLog.createdAt).toLocaleTimeString('th-TH') : 'N/A',
        percentToCritical: Math.min(100, (currentWater / crit) * 100)
      };
    } catch (e) { return { maxWater: 0, avgSignal: 0, rateOfChange: 0, timeToFlood: null, lastUpdate: 'Error', percentToCritical: 0 }; }
  }, [activeLogs, calculateWater, waterInTank, activeThresholds, devices]);

  const exportToCSV = () => { /* ฟังก์ชันเดิม */ };

  if (!isMounted || status === 'loading') {
    return <div className="flex h-screen items-center justify-center bg-[#F1F5F9] dark:bg-[#020617]"><Loader2 className="animate-spin text-blue-500" size={40} /></div>;
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F1F5F9] dark:bg-[#020617] transition-all duration-500 font-sans">
        <div className="p-8 bg-white dark:bg-slate-900 shadow-2xl rounded-[2.5rem] w-[400px] border-t-4 border-blue-500 dark:border-blue-600">
          <div className="text-center mb-8">
            <div className="inline-flex p-4 bg-blue-500/10 text-blue-500 rounded-2xl mb-4"><Waves size={32} /></div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white">Flood Monitor</h1>
            <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Secure Access</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" placeholder="ชื่อผู้ใช้งาน (Username)" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-all text-slate-800 dark:text-white" value={username} onChange={(e) => setUsername(e.target.value)} required />
            <div>
              <input type="password" placeholder="รหัสผ่าน (Password)" className={`w-full p-4 bg-slate-50 dark:bg-slate-800 border rounded-2xl outline-none transition-all text-slate-800 dark:text-white ${loginError ? "border-red-500 bg-red-50/50 dark:bg-red-900/10" : "border-slate-200 dark:border-slate-700 focus:border-blue-500"}`} value={password} onChange={(e) => { setPassword(e.target.value); setLoginError(""); }} required />
              {loginError && <p className="text-red-500 text-xs font-bold mt-2 ml-2">{loginError}</p>}
            </div>
            <button type="submit" disabled={isAuthenticating} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-colors shadow-lg shadow-blue-500/30 flex justify-center items-center mt-4">
              {isAuthenticating ? <Loader2 className="animate-spin" size={20} /> : "เข้าสู่ระบบ"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 🌟 ดึงค่า Role จาก Session มาเช็ค
  const userRole = (session?.user as any)?.role || 'user';

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
                    <button key={d.mac} onClick={() => { setSelectedDeviceMac(d.mac); setIsDropdownOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold uppercase transition-all text-left">
                      <Radio size={14} className="text-slate-400 flex-shrink-0" /> <span className="truncate">{d.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-500 transition-colors"><Sun size={20}/></button>
             
             {/* 🌟 ซ่อนปุ่มเข้าหน้า Admin ถ้าไม่ใช่ admin */}
             {userRole === 'admin' && (
               <Link href="/admin" className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-500 transition-all" title="ไปหน้าจัดการระบบ">
                 <Settings size={20} />
               </Link>
             )}
             
             <button onClick={handleLogout} className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white transition-all ml-2" title="ออกจากระบบ">
               <LogOut size={20} />
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 space-y-8">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-indigo-950 dark:to-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group border border-white/5 transition-all hover:shadow-indigo-500/10">
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
            <div className="space-y-4 text-center lg:text-left flex-1">
              <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-400 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-blue-500/20">
                <Zap size={14} className="fill-blue-400" /> AI Forecast Analysis
              </div>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
                {insights.rateOfChange > 0.1 
                  ? `น้ำกำลังสูงขึ้น! คาดว่าจะถึงขีดจำกัดใน ${insights.timeToFlood}` 
                  : insights.rateOfChange < -0.1 
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
          <div className={`lg:col-span-4 p-8 rounded-[3rem] bg-white dark:bg-slate-900 border-2 ${systemStatus.border} shadow-2xl flex flex-col justify-between relative overflow-hidden group transition-all duration-300 ${systemStatus.glow}`}>
             <div className="relative z-10">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Live Status</span>
                <div className={`text-5xl font-black mt-2 ${systemStatus.color} tracking-tighter`}>{systemStatus.label}</div>
             </div>
             <div className="mt-12 relative z-10 flex items-end justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-500 uppercase">Current Level</div>
                  <div className="text-6xl font-black text-slate-800 dark:text-white tabular-nums">{waterInTank.toFixed(2)}<span className="text-xl ml-2 text-slate-400">cm</span></div>
                </div>
                <div className={`p-5 rounded-[1.5rem] ${systemStatus.bg} text-white shadow-2xl animate-bounce`}>{systemStatus.icon}</div>
             </div>
          </div>
          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
             <StatCard icon={<TrendingUp />} label="Highest" value={insights.maxWater.toFixed(2)} unit="cm" color="blue" />
             <StatCard icon={<ActivitySquare />} label="Rate" value={(insights.rateOfChange > 0 ? "+" : "") + insights.rateOfChange.toFixed(2)} unit="cm/h" color="orange" />
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
          <div className="xl:col-span-4">
            <WaterTank level={waterInTank} warningThreshold={activeThresholds.warning} criticalThreshold={activeThresholds.critical} />
          </div>
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
  const colors: any = { blue: "text-blue-500 bg-blue-50 dark:bg-blue-500/10", orange: "text-orange-500 bg-orange-50 dark:bg-orange-500/10", pink: "text-pink-500 bg-pink-50 dark:bg-pink-500/10", indigo: "text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10" };
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-md transition-transform hover:-translate-y-1">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${colors[color]}`}>{icon}</div>
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</div>
      <div className="text-2xl font-black text-slate-800 dark:text-white mt-1 tabular-nums">{value} <span className="text-[10px] text-slate-400 font-bold ml-1">{unit}</span></div>
    </div>
  );
}