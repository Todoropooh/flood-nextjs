'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import WaterLevelChart from '@/components/WaterLevelChart';
import StatusDonut from '@/components/StatusDonut';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { 
  Waves, Settings, Sun, Moon, Activity, Thermometer, 
  Droplets, ChevronDown, AlertTriangle, CheckCircle, Database
} from 'lucide-react';

const DeviceMap = dynamic(() => import('@/components/DeviceMap'), { ssr: false });

// ==========================================
// 🛡️ 1. เกราะป้องกัน UI (Catch Silent Crashes)
// ==========================================
class SafeComponent extends React.Component<{children: React.ReactNode}, { hasError: boolean, errorMsg: string }> {
  constructor(props: {children: React.ReactNode}) { 
    super(props); 
    this.state = { hasError: false, errorMsg: '' }; 
  }
  static getDerivedStateFromError(error: any) { 
    return { hasError: true, errorMsg: error.message || String(error) }; 
  }
  componentDidCatch(error: any, errorInfo: any) { 
    console.error("🚨 เจอตัวการแล้ว! UI Crash Caught:", error, errorInfo); 
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-50 dark:bg-[#060a14]">
          <div className="bg-red-50 dark:bg-red-900/20 p-8 rounded-3xl border border-red-200 text-center max-w-lg shadow-xl">
            <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-red-600 mb-2">หน้าจอเกิดข้อผิดพลาด (UI Crash)</h1>
            <p className="text-sm text-red-500/80 font-mono bg-white/50 dark:bg-black/50 p-4 rounded-xl break-words text-left">
              {this.state.errorMsg}
            </p>
            <p className="text-xs text-slate-500 mt-4">แคปจอส่วนนี้ส่งให้ดูได้เลยครับ นี่คือสาเหตุที่ทำให้จอหาย!</p>
            <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm shadow-md transition-all">รีเฟรชหน้าเว็บ</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ฟังก์ชัน Utilities
const safeNumber = (val: any, fallback = 0) => {
  const num = Number(val);
  return isNaN(num) ? fallback : num;
};

const safeMax = (arr: any[], key: string) => {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return 0;
  return arr.reduce((max, item) => {
    const val = safeNumber(item?.[key]);
    return val > max ? val : max;
  }, -Infinity);
};

function MiniChart({ data, color = "#3b82f6" }: { data: any[], color?: string }) {
  if (!data || !Array.isArray(data) || data.length === 0) return <div className="h-10 w-full mt-1" />; 
  return (
    <div className="h-10 w-full mt-1 opacity-50">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis hide domain={['auto', 'auto']} />
          <Line type="monotone" dataKey="level" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ==========================================
// 🚀 2. ตัวหลัก: จัดการดึงข้อมูลอย่างเดียว ป้องกันข้อมูลพัง
// ==========================================
export default function Home() {
  const [logs, setLogs] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDeviceMac, setSelectedDeviceMac] = useState<string>('ALL');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [timeframe, setTimeframe] = useState('day'); 
  const [apiError, setApiError] = useState<string | null>(null);
  
  const { setTheme, resolvedTheme } = useTheme();
  const lastNotifiedRef = useRef<Record<string, string>>({});

  const fetchData = async () => {
    try {
      const timestamp = Date.now();
      const [logRes, deviceRes] = await Promise.all([
        fetch(`/api/flood?timeframe=${timeframe}&t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/devices?t=${timestamp}`, { cache: 'no-store' })
      ]);

      if (!deviceRes.ok || !logRes.ok) {
        setApiError(`API Error: เชื่อมต่อฐานข้อมูลไม่สำเร็จ (Status: ${deviceRes.status})`);
        return;
      }

      setApiError(null);

      // ✨ กรองเอา Null/Undefined ออกจาก Array แบบเด็ดขาด (นี่คือสาเหตุที่พบบ่อยสุด)
      const logData = await logRes.json();
      const safeLogs = Array.isArray(logData) ? logData.filter(l => l && typeof l === 'object').map(l => ({
        ...l, level: safeNumber(l?.level), temperature: safeNumber(l?.temperature), air_humidity: safeNumber(l?.air_humidity ?? l?.humidity)
      })) : [];
      setLogs(safeLogs);
      
      const devData = await deviceRes.json();
      const safeDevices = Array.isArray(devData) ? devData.filter(d => d && typeof d === 'object').map(d => ({
        ...d, waterLevel: safeNumber(d?.waterLevel), temperature: safeNumber(d?.temperature), humidity: safeNumber(d?.humidity ?? d?.air_humidity), criticalThreshold: safeNumber(d?.criticalThreshold, 7), warningThreshold: safeNumber(d?.warningThreshold, 3)
      })) : [];
      setDevices(safeDevices);
      
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        safeDevices.forEach(device => {
          const wl = device.waterLevel;
          if (wl >= device.criticalThreshold && lastNotifiedRef.current[device.mac] !== 'CRITICAL') {
            new Notification(`🚨 วิกฤต: ${device.name}`, { body: `ระดับน้ำ: ${wl.toFixed(1)} cm`, icon: '/logo.png' });
            lastNotifiedRef.current[device.mac] = 'CRITICAL';
          } 
        });
      }
    } catch (e: any) { 
      setApiError(`Network/Fetch Error: ${e.message}`);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchData();
    if (typeof window !== "undefined" && "Notification" in window) Notification.requestPermission();
    const interval = setInterval(fetchData, 5000); 
    return () => clearInterval(interval);
  }, [timeframe]);

  if (!isMounted) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#060a14]">
      <h1 className="text-xl font-bold text-slate-500 animate-pulse">กำลังเตรียมหน้าจอ...</h1>
    </div>
  );

  if (apiError) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#060a14] p-4">
      <div className="bg-red-50 dark:bg-red-900/20 p-8 rounded-3xl border border-red-200 text-center max-w-lg shadow-xl">
        <Database size={48} className="text-red-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-red-600 mb-2">เชื่อมต่อฐานข้อมูลล้มเหลว</h1>
        <p className="text-sm text-red-500/80 mb-6">{apiError}</p>
      </div>
    </div>
  );

  // 🛡️ ห่อการแสดงผลทั้งหมดด้วย SafeComponent
  return (
    <SafeComponent>
      <DashboardContent 
        logs={logs} devices={devices} selectedDeviceMac={selectedDeviceMac} setSelectedDeviceMac={setSelectedDeviceMac}
        isDropdownOpen={isDropdownOpen} setIsDropdownOpen={setIsDropdownOpen} timeframe={timeframe} setTimeframe={setTimeframe}
        resolvedTheme={resolvedTheme} setTheme={setTheme}
      />
    </SafeComponent>
  );
}

// ==========================================
// 📊 3. ตัวคำนวณและวาด UI (ถ้าโค้ดในนี้พัง เกราะจะทำงานทันที!)
// ==========================================
function DashboardContent({ logs, devices, selectedDeviceMac, setSelectedDeviceMac, isDropdownOpen, setIsDropdownOpen, timeframe, setTimeframe, resolvedTheme, setTheme }: any) {
  
  const displayLogs = selectedDeviceMac === 'ALL' ? logs : logs.filter((log:any) => log?.mac === selectedDeviceMac);
  const displayDevices = selectedDeviceMac === 'ALL' ? devices : devices.filter((d:any) => d?.mac === selectedDeviceMac);

  let currentLevel = 0, currentTemp = 0, currentHum = 0, systemStatus = 'NORMAL', lastUpdateTime = null;

  if (selectedDeviceMac !== 'ALL' && displayDevices.length > 0) {
    const d = displayDevices[0];
    currentLevel = d.waterLevel;
    currentTemp = d.temperature;
    currentHum = d.humidity;
    lastUpdateTime = d.updatedAt || Date.now();
    if (currentLevel >= d.criticalThreshold) systemStatus = 'CRITICAL';
    else if (currentLevel >= d.warningThreshold) systemStatus = 'WARNING';
  } else if (devices.length > 0) {
    currentLevel = safeMax(devices, 'waterLevel'); 
    currentTemp = devices.reduce((sum:number, d:any) => sum + safeNumber(d?.temperature), 0) / devices.length;
    currentHum = devices.reduce((sum:number, d:any) => sum + safeNumber(d?.humidity), 0) / devices.length;
    lastUpdateTime = devices[0]?.updatedAt || Date.now(); 
    if (devices.some((d:any) => safeNumber(d?.waterLevel) >= safeNumber(d?.criticalThreshold, 7))) systemStatus = 'CRITICAL';
    else if (devices.some((d:any) => safeNumber(d?.waterLevel) >= safeNumber(d?.warningThreshold, 3))) systemStatus = 'WARNING';
  }

  const todayStr = new Date().toDateString();
  const todayLogs = displayLogs.filter((log:any) => log?.createdAt && new Date(log.createdAt).toDateString() === todayStr);
  
  const todayMaxLevel = safeMax(todayLogs, 'level');
  const todayAvgTemp = todayLogs.length > 0 ? (todayLogs.reduce((sum:number, l:any) => sum + safeNumber(l?.temperature), 0) / todayLogs.length) : 0;
  const todayAvgHum = todayLogs.length > 0 ? (todayLogs.reduce((sum:number, l:any) => sum + safeNumber(l?.air_humidity), 0) / todayLogs.length) : 0;

  const getStatusDesign = (level: number, warning: number, critical: number) => {
    if (level >= critical) return { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: <AlertTriangle size={24} className="text-red-500 animate-pulse" /> };
    if (level >= warning) return { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: <AlertTriangle size={24} className="text-orange-500" /> };
    return { color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: <CheckCircle size={24} className="text-emerald-500" /> };
  };

  return (
    <main className="min-h-screen relative pb-20 font-sans text-slate-800 dark:text-white bg-slate-50 dark:bg-[#060a14]">
      
      <div className="fixed inset-0 -z-10">
        <img src="https://img.freepik.com/premium-photo/gradient-defocused-abstract-luxury-vivid-blurred-colorful-texture-wallpaper-photo-background_98870-1088.jpg" className="w-full h-full object-cover opacity-100" alt="bg" />
        <div className="absolute inset-0 bg-white/20 dark:bg-black/40 backdrop-blur-xl" />
      </div>

      <div className="fixed top-0 left-0 right-0 z-50 w-full bg-white/40 dark:bg-[#0a0f1c]/50 backdrop-blur-2xl border-b border-white/50 dark:border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-md"><Waves size={16} strokeWidth={2.5} /></div>
            <div className="relative">
              <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-2 px-3 py-1.5 bg-white/50 dark:bg-white/5 rounded-lg hover:bg-white/80 transition-all border border-white/50 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  {selectedDeviceMac === 'ALL' ? 'Overview (กำลังทดสอบ)' : devices.find((d:any) => d.mac === selectedDeviceMac)?.name || 'Unknown'}
                </span>
                <ChevronDown size={14} />
              </button>
              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white/90 dark:bg-[#151b2b]/95 backdrop-blur-2xl border border-white/50 shadow-2xl rounded-2xl overflow-hidden z-50 p-1">
                  <button onClick={() => { setSelectedDeviceMac('ALL'); setIsDropdownOpen(false); }} className="w-full text-left px-4 py-3 text-[11px] font-bold rounded-xl transition-colors uppercase tracking-widest">🌍 Overview</button>
                  {devices.map((device:any) => (
                    <button key={device.mac} onClick={() => { setSelectedDeviceMac(device.mac); setIsDropdownOpen(false); }} className="w-full text-left px-4 py-3 text-[11px] font-bold rounded-xl mt-1 transition-colors uppercase tracking-widest">📍 {device.name}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center bg-white/40 dark:bg-black/40 p-1 rounded-xl backdrop-blur-md shadow-inner">
              <button onClick={() => setTheme('light')} className={`p-1.5 rounded-md ${resolvedTheme === 'light' ? 'bg-white text-blue-500 shadow-sm' : 'text-slate-600'}`}><Sun size={14}/></button>
              <button onClick={() => setTheme('dark')} className={`p-1.5 rounded-md ${resolvedTheme === 'dark' ? 'bg-black/40 text-blue-400 shadow-sm' : 'text-slate-600'}`}><Moon size={14}/></button>
            </div>
            <Link href="/admin" className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"><Settings size={14} /> Admin</Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-24 mt-6 space-y-6 relative z-10 opacity-100">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label={selectedDeviceMac === 'ALL' ? 'Max Level' : 'Current Level'} val={Number(currentLevel).toFixed(1)} unit="cm" subVal={`Peak: ${Number(todayMaxLevel).toFixed(1)} cm`} icon={Waves} color="text-blue-500" />
          <MetricCard label="Temperature" val={Number(currentTemp).toFixed(1)} unit="°C" subVal={`Avg: ${Number(todayAvgTemp).toFixed(1)} °C`} icon={Thermometer} color="text-orange-500" />
          <MetricCard label="Humidity" val={Number(currentHum).toFixed(0)} unit="%" subVal={`Avg: ${Number(todayAvgHum).toFixed(0)} %`} icon={Droplets} color="text-cyan-500" />
          <StatusCard status={systemStatus} lastUpdate={lastUpdateTime} />
        </div>

        {selectedDeviceMac === 'ALL' && devices.length > 0 && (
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3 pl-1 flex items-center gap-2">Live Nodes Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {devices.map((device:any) => {
                const wl = device.waterLevel;
                const status = getStatusDesign(wl, device.warningThreshold, device.criticalThreshold);
                const percent = Math.min((wl / (device.criticalThreshold || 10)) * 100, 100);
                const deviceMiniLogs = logs.filter((l:any) => l.mac === device.mac).map((l:any) => ({ level: l.level })).reverse().slice(-10);

                return (
                  <div key={device.mac} onClick={() => setSelectedDeviceMac(device.mac)} className="cursor-pointer bg-white/50 dark:bg-[#111827]/60 border border-white/50 dark:border-white/10 p-5 rounded-3xl backdrop-blur-xl transition-all shadow-sm group">
                    <div className={`absolute inset-0 ${status.bg} transition-all -z-10 opacity-10`} />
                    <div className="flex justify-between items-center mb-2 gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center shrink-0 shadow-sm"><Waves size={20} className={status.color} /></div>
                        <div>
                          <h4 className="font-bold uppercase text-xs w-24 truncate">{device.name}</h4>
                          <div className={`text-[9px] font-bold mt-0.5 px-2 py-0.5 rounded-lg w-fit shadow-sm bg-white/60 ${status.color}`}>{Number(wl).toFixed(1)} cm</div>
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-white/60 shadow-sm">{status.icon}</div>
                    </div>
                    <div className="flex gap-3 mt-1 pl-1 text-[10px] font-medium text-slate-500">
                      <span className="flex items-center gap-1"><Thermometer size={10} className="text-orange-500" /> {Number(device.temperature).toFixed(1)}°C</span>
                      <span className="flex items-center gap-1"><Droplets size={10} className="text-cyan-500" /> {Number(device.humidity).toFixed(1)}%</span>
                    </div>
                    <SafeComponent>
                       <MiniChart data={deviceMiniLogs} color={wl >= device.criticalThreshold ? "#ef4444" : "#3b82f6"} />
                    </SafeComponent>
                    <div className="h-1 w-full bg-white/40 rounded-full overflow-hidden mt-3">
                      <div className={`h-full rounded-full ${wl >= device.criticalThreshold ? 'bg-red-500' : wl >= device.warningThreshold ? 'bg-orange-500' : 'bg-blue-500'}`} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 bg-white/50 dark:bg-[#111827]/60 p-6 md:p-8 rounded-[2.5rem] border border-white/50 shadow-lg backdrop-blur-2xl min-h-[380px] flex flex-col">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 relative z-10">
              <h3 className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200 tracking-widest flex items-center gap-2"><Activity size={16} className="text-blue-500"/> Analytics Trend</h3>
              <div className="flex bg-black/5 p-1 rounded-xl shadow-inner w-fit">
                {['day', 'week', 'month', 'year'].map((tf) => (
                  <button key={tf} onClick={() => setTimeframe(tf)} className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded-lg ${timeframe === tf ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>{tf}</button>
                ))}
              </div>
            </div>
            <div className="h-[280px] w-full relative z-0 mt-2 flex-grow">
              <SafeComponent>
                 <WaterLevelChart data={displayLogs} isDark={resolvedTheme === 'dark'} timeframe={timeframe} devices={devices} selectedDeviceMac={selectedDeviceMac} />
              </SafeComponent>
            </div>
          </div>
          <div className="lg:col-span-4 bg-white/50 dark:bg-[#111827]/60 p-6 md:p-8 rounded-[2.5rem] border border-white/50 shadow-lg backdrop-blur-2xl flex flex-col justify-center relative">
             <h3 className="absolute top-8 left-8 text-[11px] font-black uppercase text-slate-800 dark:text-slate-200 tracking-widest">Status Distribution</h3>
             <div className="w-full h-[220px] mt-10">
               <SafeComponent>
                  <StatusDonut logs={displayLogs} isDark={resolvedTheme === 'dark'} />
               </SafeComponent>
             </div>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <div className="bg-white/50 dark:bg-[#111827]/60 p-2 rounded-[2.5rem] border border-white/50 shadow-lg backdrop-blur-xl overflow-hidden">
            <div className="h-[400px] w-full rounded-[2rem] overflow-hidden relative z-0">
               <SafeComponent>
                  <DeviceMap devices={displayDevices} selectedDevice={null} />
               </SafeComponent>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function MetricCard({ label, val, unit, subVal, icon: Icon, color }: any) {
  return (
    <div className="bg-white/50 dark:bg-[#111827]/60 p-5 md:p-6 rounded-3xl border border-white/50 shadow-lg backdrop-blur-xl h-[140px] flex flex-col justify-between relative overflow-hidden">
      <div className={`absolute -right-8 -top-8 w-32 h-32 ${color.replace('text', 'bg')}/5 rounded-full blur-2xl`} />
      <div className="flex justify-between items-start relative z-10">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
        <div className={`p-2.5 rounded-xl bg-white/80 shadow-sm ${color}`}><Icon size={18} strokeWidth={2.5}/></div>
      </div>
      <div className="relative z-10">
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-3xl md:text-4xl font-black">{val}</span>
          <span className="text-xs font-bold text-slate-500 ml-1">{unit}</span>
        </div>
        {subVal && <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{subVal}</div>}
      </div>
    </div>
  );
}

function StatusCard({ status, lastUpdate }: any) {
  const isDataOld = !lastUpdate || (Date.now() - new Date(lastUpdate).getTime() > 10 * 60 * 1000); 
  const displayStatus = isDataOld ? 'OFFLINE' : (status || 'NORMAL');
  const isCritical = displayStatus.toLowerCase() === 'critical';
  const isWarning = displayStatus.toLowerCase() === 'warning';
  const isOffline = displayStatus === 'OFFLINE';
  
  const safeTimeFormat = (dateVal: any) => {
    if (!dateVal) return 'Waiting...';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'Time Error';
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white/50 dark:bg-[#111827]/60 p-5 md:p-6 rounded-3xl border border-white/50 shadow-lg backdrop-blur-xl h-[140px] flex flex-col justify-between relative overflow-hidden">
      <div className={`absolute -right-8 -top-8 w-32 h-32 ${isCritical?'bg-red-500/5':isWarning?'bg-orange-500/5':isOffline?'bg-slate-500/5':'bg-emerald-500/5'} rounded-full blur-2xl`} />
      <div className="flex justify-between items-start relative z-10">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">System Status</span>
        <div className={`p-2.5 rounded-xl bg-white/80 shadow-sm ${isCritical ? 'text-red-500' : isWarning ? 'text-orange-500' : isOffline ? 'text-slate-400' : 'text-emerald-500'}`}>
          <Activity size={18} strokeWidth={2.5}/>
        </div>
      </div>
      <div className="relative z-10">
        <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest shadow-sm border ${isCritical ? 'bg-red-100 text-red-600' : isWarning ? 'bg-orange-100 text-orange-600' : isOffline ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-600'}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isCritical ? 'bg-red-500 animate-ping' : isWarning ? 'bg-orange-500 animate-pulse' : isOffline ? 'bg-slate-400' : 'bg-emerald-500'}`} />
          {displayStatus.toUpperCase()}
        </div>
        <div className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Last: {safeTimeFormat(lastUpdate)}</div>
      </div>
    </div>
  );
}