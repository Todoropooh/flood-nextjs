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

  // 🌟 [PHASE 3] ดึงค่าเกณฑ์จาก LocalStorage (ถ้าไม่มีให้ใช้ 5 กับ 10 เป็นค่าเริ่มต้น)
  const [thresholds, setThresholds] = useState({ warning: 5.0, critical: 10.0 });

  useEffect(() => { 
    setIsMounted(true); 
    
    // โหลดค่าเกณฑ์น้ำ
    const loadThresholds = () => {
      const savedWarning = localStorage.getItem('flood_warning_level');
      const savedCritical = localStorage.getItem('flood_critical_level');
      if (savedWarning || savedCritical) {
        setThresholds({
          warning: savedWarning ? Number(savedWarning) : 5.0,
          critical: savedCritical ? Number(savedCritical) : 10.0
        });
      }
    };
    
    loadThresholds();

    // เผื่อกรณี User กลับมาจากหน้า Admin ให้โหลดค่าใหม่
    window.addEventListener('focus', loadThresholds);
    return () => window.removeEventListener('focus', loadThresholds);
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

  // 🌟 สูตร Calibrate 62.0 
  const calculateWater = useCallback((level: any) => {
    const raw = Number(level ?? 62.0); 
    let val = (62.0 - raw); 
    if (raw <= 0.5 || raw > 75) val = 0; 
    return val < 0 ? 0 : (val > 40 ? 40 : val); 
  }, []);

  // กรอง Logs ตามอุปกรณ์ที่เลือก (Check ความปลอดภัย)
  const activeLogs = useMemo(() => {
    if (!Array.isArray(logs) || logs.length === 0) return [];
    return selectedDeviceMac === 'ALL' ? logs : logs.filter(l => (l.mac || l.device_id) === selectedDeviceMac);
  }, [logs, selectedDeviceMac]);

  // คำนวณระดับน้ำล่าสุด
  const waterInTank = useMemo(() => {
    if (activeLogs.length === 0) return 0;
    const lastEntry = activeLogs[activeLogs.length - 1];
    return calculateWater(lastEntry?.level);
  }, [activeLogs, calculateWater]);

  // 🌟 สถานะระบบ (เปลี่ยนจากเลขฟิกซ์ตายตัว มาใช้ค่า thresholds จาก Admin แทน)
  const status = useMemo(() => {
    if (waterInTank >= thresholds.critical) return { label: "CRITICAL", color: "text-red-500", bg: "bg-red-500", icon: <ShieldAlert size={24}/>, border: "border-red-500", glow: "shadow-red-500/20" };
    if (waterInTank >= thresholds.warning) return { label: "WARNING", color: "text-orange-500", bg: "bg-orange-500", icon: <AlertTriangle size={24}/>, border: "border-orange-500", glow: "shadow-orange-500/20" };
    return { label: "STABLE", color: "text-emerald-500", bg: "bg-emerald-500", icon: <CheckCircle2 size={24}/>, border: "border-emerald-500", glow: "shadow-emerald-500/20" };
  }, [waterInTank, thresholds]);

  // ข้อมูลเชิงลึก (ป้องกัน Error Math.max และ Date)
  const insights = useMemo(() => {
    if (activeLogs.length === 0) {
      return { maxWater: 0, avgSignal: 0, rateOfChange: 0, timeToFlood: null, lastUpdate: 'Waiting...' };
    }
    
    try {
      const latestLog = activeLogs[activeLogs.length - 1];
      const allWater = activeLogs.map(l => calculateWater(l.level));
      
      const latestTime = new Date(latestLog?.createdAt || Date.now()).getTime();
      const oldLog = activeLogs.find(l => new Date(l.createdAt).getTime() >= latestTime - 3600000) || activeLogs[0];
      const hourDiff = (latestTime - new Date(oldLog.createdAt).getTime()) / 3600000;
      const rate = hourDiff > 0 ? (calculateWater(latestLog.level) - calculateWater(oldLog.level)) / hourDiff : 0;

      let timeStr = null;
      // 🌟 อัปเดตสูตรคำนวณเวลาท่วม ให้ใช้ค่า Critical ใหม่
      if (rate > 0 && waterInTank < thresholds.critical) {
        const mins = Math.round(((thresholds.critical - waterInTank) / rate) * 60);
        timeStr = mins > 0 ? `${mins} นาที` : "เร็วๆ นี้";
      }

      return { 
        maxWater: Math.max(...allWater, 0), 
        avgSignal: latestLog?.signal === 99 ? 0 : (latestLog?.signal || 0), 
        rateOfChange: rate, 
        timeToFlood: timeStr,
        lastUpdate: latestLog?.createdAt ? new Date(latestLog.createdAt).toLocaleTimeString('th-TH') : 'N/A'
      };
    } catch (e) {
      return { maxWater: 0, avgSignal: 0, rateOfChange: 0, timeToFlood: null, lastUpdate: 'Error' };
    }
  }, [activeLogs, calculateWater, waterInTank, thresholds]);


  // 🌟 [PHASE 1] ฟังก์ชัน Export ข้อมูลเป็นไฟล์ Excel (CSV)
  const exportToCSV = () => {
    if (!activeLogs || activeLogs.length === 0) {
      alert("ไม่มีข้อมูลสำหรับดาวน์โหลดครับ");
      return;
    }

    // สร้างหัวตาราง (Headers)
    let csvContent = "วันที่,เวลา,อุปกรณ์ (MAC),ระดับน้ำ (cm),อุณหภูมิ (C),ความชื้น (%)\n";

    // วนลูปเอาข้อมูลมาใส่ทีละบรรทัด (ใช้ activeLogs เพื่อให้ได้ข้อมูลตามอุปกรณ์ที่เลือกอยู่)
    activeLogs.forEach((log: any) => {
      const date = new Date(log.createdAt).toLocaleDateString('th-TH');
      const time = new Date(log.createdAt).toLocaleTimeString('th-TH');
      const deviceMac = log.mac || log.device_id || "Unknown";
      
      // คำนวณระดับน้ำด้วยสูตร Calibrate
      const rawLevel = Number(log.level ?? 62.0);
      let calcLevel = (62.0 - rawLevel);
      if (rawLevel <= 0.5 || rawLevel > 75) calcLevel = 0;
      if (calcLevel < 0) calcLevel = 0;
      if (calcLevel > 40) calcLevel = 40;
      
      const level = calcLevel.toFixed(2);
      const temp = log.temperature ? Number(log.temperature).toFixed(1) : "0.0";
      const hum = log.humidity || log.air_humidity ? Number(log.humidity || log.air_humidity).toFixed(1) : "0.0";

      csvContent += `${date},${time},${deviceMac},${level},${temp},${hum}\n`;
    });

    // สร้างไฟล์และสั่งดาวน์โหลด
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); // \uFEFF ช่วยให้ Excel อ่านภาษาไทยได้สมบูรณ์
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = selectedDeviceMac === 'ALL' ? `WaterLevel_All_Devices_${dateStr}.csv` : `WaterLevel_${selectedDeviceMac}_${dateStr}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  if (!isMounted) return null;

  // ถ้ายังดึงข้อมูลครั้งแรกไม่เสร็จ ให้โชว์หน้า Loading แทนการปล่อยให้ Script ทำงานจนล่ม
  if (logs.length === 0 && devices.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#020617] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Initializing System...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#020617] transition-all duration-500 font-sans pb-10">
      <header className="sticky top-0 z-[100] bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-8 py-4 print:hidden">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white shadow-lg"><Waves size={24}/></div>
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
             <button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-500"><Sun size={20}/></button>
             <Link href="/admin" className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-500 transition-all"><Settings size={20} /></Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className={`lg:col-span-4 p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 ${status.border} shadow-2xl flex flex-col justify-between relative overflow-hidden group transition-all duration-300 ${status.glow}`}>
             <div className="relative z-10">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Live Status</span>
                <div className={`text-5xl font-black mt-2 ${status.color} tracking-tighter`}>{status.label}</div>
             </div>
             <div className="mt-8 relative z-10 flex items-end justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-500 uppercase">Live Water</div>
                  <div className="text-6xl font-black text-slate-800 dark:text-white tabular-nums">{waterInTank.toFixed(1)}<span className="text-xl ml-2 text-slate-400">cm</span></div>
                </div>
                <div className={`p-4 rounded-3xl ${status.bg} text-white shadow-xl animate-bounce`}>{status.icon}</div>
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
          <div className="xl:col-span-8 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl min-h-[500px]">
             <div className="h-[420px]">
                <WaterLevelChart data={activeLogs} isDark={resolvedTheme === 'dark'} devices={devices} timeframe={timeframe} selectedDeviceMac={selectedDeviceMac} />
             </div>
          </div>
          <div className="xl:col-span-4"><WaterTank level={waterInTank} /></div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
           <div className="xl:col-span-7 rounded-[2.5rem] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900 p-4">
              <div className="h-[500px] rounded-[2rem] overflow-hidden">
                <DeviceMap devices={devices.filter(d => selectedDeviceMac === 'ALL' || d.mac === selectedDeviceMac)} />
              </div>
           </div>
           
           {/* 🌟 ปรับปรุงส่วน Records เพิ่มปุ่ม Download Excel */}
           <div className="xl:col-span-5 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col h-[532px]">
              <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/50">
                 <div>
                   <h3 className="font-black uppercase text-slate-700 dark:text-white tracking-widest text-xs flex items-center gap-2">
                     <Database size={16} className="text-indigo-500"/> Records
                   </h3>
                   <span className="text-[10px] font-bold text-slate-400 mt-1 block">Sync: {insights.lastUpdate}</span>
                 </div>
                 
                 {/* ปุ่ม Export to CSV */}
                 <button 
                   onClick={exportToCSV}
                   className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/30 active:scale-95"
                 >
                   <Download size={14} /> <span className="hidden sm:inline">Export CSV</span>
                 </button>
              </div>

              <div className="flex-grow overflow-auto">
                 <RecentLogs logs={activeLogs} />
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
    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-md">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colors[color]}`}>{icon}</div>
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</div>
      <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">{value} <span className="text-[10px] text-slate-400">{unit}</span></div>
    </div>
  );
}