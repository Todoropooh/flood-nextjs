'use client';

import { useEffect, useState, useRef } from 'react';
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

const safeNumber = (val: any, fallback = 0) => {
  const num = Number(val);
  return isNaN(num) ? fallback : num;
};

const safeMax = (arr: any[], key: string) => {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((max, item) => {
    const val = safeNumber(item[key]);
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

export default function Home() {
  const [logs, setLogs] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDeviceMac, setSelectedDeviceMac] = useState<string>('ALL');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [timeframe, setTimeframe] = useState('day'); 
  
  // ✨ เพิ่ม State สำหรับดัก Error โดยเฉพาะ
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

      // ดักจับ Error กรณีต่อ DB ไม่ติด
      if (!deviceRes.ok || !logRes.ok) {
        setApiError(`API Error: ไม่สามารถเชื่อมต่อฐานข้อมูลได้ (Status: ${deviceRes.status})`);
        return;
      }

      setApiError(null); // เคลียร์ Error ถ้าโหลดสำเร็จ

      const logData = await logRes.json();
      const safeLogs = Array.isArray(logData) ? logData.map(l => ({
        ...l, level: safeNumber(l.level), temperature: safeNumber(l.temperature), air_humidity: safeNumber(l.air_humidity ?? l.humidity)
      })) : [];
      setLogs(safeLogs);
      
      const devData = await deviceRes.json();
      const safeDevices = Array.isArray(devData) ? devData.map(d => ({
        ...d, waterLevel: safeNumber(d.waterLevel), temperature: safeNumber(d.temperature), humidity: safeNumber(d.humidity ?? d.air_humidity), criticalThreshold: safeNumber(d.criticalThreshold, 7), warningThreshold: safeNumber(d.warningThreshold, 3)
      })) : [];
      
      setDevices(safeDevices);
      checkAndNotify(safeDevices); 
      
    } catch (e: any) { 
      setApiError(`Network/Fetch Error: ${e.message}`);
    }
  };

  const checkAndNotify = (currentDevices: any[]) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "granted" && Array.isArray(currentDevices)) {
      currentDevices.forEach(device => {
        const wl = device.waterLevel;
        if (wl >= device.criticalThreshold && lastNotifiedRef.current[device.mac] !== 'CRITICAL') {
          new Notification(`🚨 ระดับน้ำวิกฤต: ${device.name}`, { body: `ระดับน้ำสูงถึง ${wl.toFixed(1)} cm`, icon: '/logo.png' });
          lastNotifiedRef.current[device.mac] = 'CRITICAL';
        } 
      });
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchData();
    if (typeof window !== "undefined" && "Notification" in window) Notification.requestPermission();
    const interval = setInterval(fetchData, 5000); 
    return () => clearInterval(interval);
  }, [timeframe]);

  // หน้าจอตอนกำลังโหลด
  if (!isMounted) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#060a14]">
      <h1 className="text-xl font-bold text-slate-500 animate-pulse">กำลังเตรียมหน้าจอ...</h1>
    </div>
  );

  // ✨ หน้าจอถ้าเกิด Database Error
  if (apiError) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#060a14] p-4">
      <div className="bg-red-50 dark:bg-red-900/20 p-8 rounded-3xl border border-red-200 dark:border-red-500/30 text-center max-w-lg shadow-xl">
        <Database size={48} className="text-red-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">เชื่อมต่อฐานข้อมูลล้มเหลว</h1>
        <p className="text-sm text-red-500/80 mb-6">{apiError}</p>
        <div className="text-left text-xs text-slate-600 dark:text-slate-400 space-y-2 bg-white/50 dark:bg-black/30 p-4 rounded-xl">
          <p className="font-bold">💡 วิธีแก้ไขเบื้องต้น:</p>
          <p>1. เข้าเว็บ MongoDB Atlas</p>
          <p>2. ไปที่เมนู <b>Network Access</b> (ด้านซ้าย)</p>
          <p>3. กด Add IP Address แล้วเลือก <b>Allow Access From Anywhere</b> (0.0.0.0/0)</p>
          <p>4. รอ 1-2 นาที แล้วรีเฟรชหน้านี้ใหม่</p>
        </div>
      </div>
    </div>
  );

  const displayLogs = selectedDeviceMac === 'ALL' ? logs : logs.filter(log => log.mac === selectedDeviceMac);
  const displayDevices = selectedDeviceMac === 'ALL' ? devices : devices.filter(d => d.mac === selectedDeviceMac);

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
    currentTemp = devices.reduce((sum, d) => sum + d.temperature, 0) / devices.length;
    currentHum = devices.reduce((sum, d) => sum + d.humidity, 0) / devices.length;
    lastUpdateTime = devices[0]?.updatedAt || Date.now(); 
    if (devices.some(d => d.waterLevel >= d.criticalThreshold)) systemStatus = 'CRITICAL';
    else if (devices.some(d => d.waterLevel >= d.warningThreshold)) systemStatus = 'WARNING';
  }

  const todayStr = new Date().toDateString();
  const todayLogs = displayLogs.filter(log => log.createdAt && new Date(log.createdAt).toDateString() === todayStr);
  
  const todayMaxLevel = safeMax(todayLogs, 'level');
  const todayAvgTemp = todayLogs.length > 0 ? (todayLogs.reduce((sum, l) => sum + l.temperature, 0) / todayLogs.length) : 0;
  const todayAvgHum = todayLogs.length > 0 ? (todayLogs.reduce((sum, l) => sum + l.air_humidity, 0) / todayLogs.length) : 0;

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
            <div className="hidden md:flex gap-2 mr-2">
              <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-black/10 shadow-sm"></div>
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-black/10 shadow-sm"></div>
              <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-black/10 shadow-sm"></div>
            </div>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-md"><Waves size={16} strokeWidth={2.5} /></div>
            <div className="relative">
              <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-2 px-3 py-1.5 bg-white/50 dark:bg-white/5 rounded-lg hover:bg-white/80 dark:hover:bg-white/10 transition-all border border-white/50 dark:border-white/5 shadow-sm">
                <span className="text-[11px] font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  {selectedDeviceMac === 'ALL' ? 'Overview' : devices.find(d => d.mac === selectedDeviceMac)?.name || 'Unknown'}
                </span>
                <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white/90 dark:bg-[#151b2b]/95 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-2xl rounded-2xl overflow-hidden z-50 p-1">
                  <button onClick={() => { setSelectedDeviceMac('ALL'); setIsDropdownOpen(false); }} className={`w-full text-left px-4 py-3 text-[11px] font-bold rounded-xl transition-colors uppercase tracking-widest ${selectedDeviceMac === 'ALL' ? 'bg-blue-500 text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'}`}>🌍 Overview</button>
                  {devices.map(device => (
                    <button key={device.mac} onClick={() => { setSelectedDeviceMac(device.mac); setIsDropdownOpen(false); }} className={`w-full text-left px-4 py-3 text-[11px] font-bold rounded-xl mt-1 transition-colors uppercase tracking-widest ${selectedDeviceMac === device.mac ? 'bg-blue-500 text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'}`}>📍 {device.name}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center bg-white/40 dark:bg-black/40 p-1 rounded-xl backdrop-blur-md border border-white/50 dark:border-white/5 shadow-inner">
              <button onClick={() => setTheme('light')} className={`p-1.5 rounded-md transition-all duration-300 ${resolvedTheme === 'light' ? 'bg-white text-blue-500 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'}`}><Sun size={14}/></button>
              <button onClick={() => setTheme('dark')} className={`p-1.5 rounded-md transition-all duration-300 ${resolvedTheme === 'dark' ? 'bg-black/40 text-blue-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-200'}`}><Moon size={14}/></button>
            </div>
            <Link href="/admin" className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg text-[10px] font-bold uppercase tracking-widest hover:-translate-y-0.5 transition-all flex items-center gap-2"><Settings size={14} className="animate-spin-slow" /> Admin</Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-24 mt-6 space-y-6 relative z-10 opacity-100">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label={selectedDeviceMac === 'ALL' ? 'Max Level' : 'Current Level'} val={currentLevel.toFixed(1)} unit="cm" subVal={`Peak: ${todayMaxLevel.toFixed(1)} cm`} icon={Waves} color="text-blue-500" />
          <MetricCard label="Temperature" val={currentTemp.toFixed(1)} unit="°C" subVal={`Avg: ${todayAvgTemp.toFixed(1)} °C`} icon={Thermometer} color="text-orange-500" />
          <MetricCard label="Humidity" val={currentHum.toFixed(0)} unit="%" subVal={`Avg: ${todayAvgHum.toFixed(0)} %`} icon={Droplets} color="text-cyan-500" />
          <StatusCard status={systemStatus} lastUpdate={lastUpdateTime} />
        </div>

        {/* ✨ ถอดเงื่อนไข devices.length > 0 ออก เพื่อให้มันโชว์สถานะแม้ไม่มีอุปกรณ์ */}
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3 pl-1 flex items-center gap-2">Live Nodes Status</h3>
          {devices.length === 0 ? (
             <div className="bg-white/50 dark:bg-black/30 p-10 rounded-3xl border border-dashed border-slate-400 dark:border-slate-600 text-center backdrop-blur-xl">
                <p className="text-slate-600 dark:text-slate-300 font-bold mb-2">ยังไม่มีข้อมูลอุปกรณ์แสดงผล</p>
                <p className="text-xs text-slate-500">กรุณาเพิ่มอุปกรณ์ในหน้า Admin หรือรอให้บอร์ดส่งข้อมูลรอบถัดไป</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {devices.map((device) => {
                const wl = device.waterLevel;
                const status = getStatusDesign(wl, device.warningThreshold, device.criticalThreshold);
                const percent = Math.min((wl / (device.criticalThreshold || 10)) * 100, 100);
                const deviceMiniLogs = logs.filter(l => l.mac === device.mac).map(l => ({ level: l.level })).reverse().slice(-10);

                return (
                  <div key={device.mac} onClick={() => setSelectedDeviceMac(device.mac)} className="cursor-pointer bg-white/50 dark:bg-[#111827]/60 border border-white/50 dark:border-white/10 p-5 rounded-3xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl relative flex flex-col group overflow-hidden shadow-sm">
                    <div className={`absolute inset-0 ${status.bg} transition-all duration-1000 ease-in-out -z-10 opacity-10`} />
                    <div className="flex justify-between items-center mb-2 gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/80 dark:bg-black/40 border border-white/50 dark:border-white/10 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300">{device.image ? <img src={device.image} alt={device.name} className="w-full h-full object-cover" /> : <Waves size={20} className={status.color} />}</div>
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-white uppercase text-xs group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate w-24">{device.name}</h4>
                          <div className={`text-[9px] font-bold mt-0.5 px-2 py-0.5 rounded-lg w-fit uppercase shadow-sm border border-white/50 dark:border-white/5 bg-white/60 dark:bg-black/30 ${status.color}`}>
                            {wl.toFixed(1)} cm
                          </div>
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-white/60 dark:bg-black/30 shadow-sm border border-white/50 dark:border-white/5 group-hover:rotate-12 transition-transform">{status.icon}</div>
                    </div>
                    
                    <div className="flex gap-3 mt-1 pl-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1"><Thermometer size={10} className="text-orange-500" /> {device.temperature.toFixed(1)}°C</span>
                      <span className="flex items-center gap-1"><Droplets size={10} className="text-cyan-500" /> {device.humidity.toFixed(1)}%</span>
                    </div>

                    <MiniChart data={deviceMiniLogs} color={wl >= device.criticalThreshold ? "#ef4444" : "#3b82f6"} />

                    <div className="h-1 w-full bg-white/40 dark:bg-black/50 rounded-full overflow-hidden mt-3">
                      <div className={`h-full rounded-full transition-all duration-1000 ${wl >= device.criticalThreshold ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : wl >= device.warningThreshold ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'}`} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 bg-white/50 dark:bg-[#111827]/60 p-6 md:p-8 rounded-[2.5rem] border border-white/50 dark:border-white/10 shadow-lg dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-2xl min-h-[380px] flex flex-col relative group transition-colors hover:bg-white/60 dark:hover:bg-[#111827]/70">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 relative z-10">
              <h3 className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200 tracking-widest flex items-center gap-2"><Activity size={16} className="text-blue-500"/> Analytics Trend</h3>
              <div className="flex bg-black/5 dark:bg-black/30 p-1 rounded-xl border border-black/5 dark:border-white/5 shadow-inner w-fit">
                {['day', 'week', 'month', 'year'].map((tf) => (
                  <button key={tf} type="button" onClick={() => setTimeframe(tf)} className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all duration-300 ${timeframe === tf ? 'bg-white dark:bg-white/10 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>{tf}</button>
                ))}
              </div>
            </div>
            <div className="h-[280px] w-full relative z-0 mt-2 flex-grow">
              <WaterLevelChart data={displayLogs} isDark={resolvedTheme === 'dark'} timeframe={timeframe} devices={devices} selectedDeviceMac={selectedDeviceMac} />
            </div>
          </div>
          <div className="lg:col-span-4 bg-white/50 dark:bg-[#111827]/60 p-6 md:p-8 rounded-[2.5rem] border border-white/50 dark:border-white/10 shadow-lg dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-2xl flex flex-col justify-center relative group transition-colors hover:bg-white/60 dark:hover:bg-[#111827]/70">
             <h3 className="absolute top-8 left-8 text-[11px] font-black uppercase text-slate-800 dark:text-slate-200 tracking-widest">Status Distribution</h3>
             <div className="w-full h-[220px] mt-10"><StatusDonut logs={displayLogs} isDark={resolvedTheme === 'dark'} /></div>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <div className="bg-white/50 dark:bg-[#111827]/60 p-2 rounded-[2.5rem] border border-white/50 dark:border-white/10 shadow-lg dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-xl overflow-hidden">
            <div className="h-[400px] w-full rounded-[2rem] overflow-hidden relative z-0">
              <DeviceMap devices={displayDevices} selectedDevice={null} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function MetricCard({ label, val, unit, subVal, icon: Icon, color }: any) {
  return (
    <div className="group bg-white/50 dark:bg-[#111827]/60 p-5 md:p-6 rounded-3xl border border-white/50 dark:border-white/10 shadow-lg backdrop-blur-xl h-[140px] flex flex-col justify-between transition-all duration-500 hover:-translate-y-1 hover:bg-white/60 dark:hover:bg-[#111827]/80 relative overflow-hidden">
      <div className={`absolute -right-8 -top-8 w-32 h-32 ${color.replace('text', 'bg')}/5 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700`} />
      <div className="flex justify-between items-start relative z-10">
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</span>
        <div className={`p-2.5 rounded-xl bg-white/80 dark:bg-black/30 shadow-sm border border-white/50 dark:border-white/5 group-hover:scale-110 transition-transform duration-300 ${color}`}><Icon size={18} strokeWidth={2.5}/></div>
      </div>
      <div className="relative z-10">
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-3xl md:text-4xl font-black tracking-tight text-slate-800 dark:text-white">{val}</span>
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
    <div className="group bg-white/50 dark:bg-[#111827]/60 p-5 md:p-6 rounded-3xl border border-white/50 dark:border-white/10 shadow-lg backdrop-blur-xl h-[140px] flex flex-col justify-between transition-all duration-500 hover:-translate-y-1 hover:bg-white/60 dark:hover:bg-[#111827]/80 relative overflow-hidden">
      <div className={`absolute -right-8 -top-8 w-32 h-32 ${isCritical?'bg-red-500/5':isWarning?'bg-orange-500/5':isOffline?'bg-slate-500/5':'bg-emerald-500/5'} rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700`} />
      <div className="flex justify-between items-start relative z-10">
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">System Status</span>
        <div className={`p-2.5 rounded-xl bg-white/80 dark:bg-black/30 shadow-sm border border-white/50 dark:border-white/5 group-hover:scale-110 transition-transform duration-300 ${isCritical ? 'text-red-500' : isWarning ? 'text-orange-500' : isOffline ? 'text-slate-400' : 'text-emerald-500'}`}>
          <Activity size={18} strokeWidth={2.5}/>
        </div>
      </div>
      <div className="relative z-10">
        <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest shadow-sm border
          ${isCritical ? 'bg-red-100/80 text-red-600 dark:bg-red-500/20 dark:text-red-400 border-red-200/50 dark:border-red-500/30' : 
            isWarning ? 'bg-orange-100/80 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 border-orange-200/50 dark:border-orange-500/30' : 
            isOffline ? 'bg-slate-100/80 text-slate-600 dark:bg-white/10 dark:text-slate-300 border-slate-200/50 dark:border-white/10' : 
            'bg-emerald-100/80 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/30'}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isCritical ? 'bg-red-500 animate-ping' : isWarning ? 'bg-orange-500 animate-pulse' : isOffline ? 'bg-slate-400' : 'bg-emerald-500'}`} />
          {displayStatus.toUpperCase()}
        </div>
        <div className="text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-widest">
          Last: {safeTimeFormat(lastUpdate)}
        </div>
      </div>
    </div>
  );
}