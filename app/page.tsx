'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation'; 
import Link from 'next/link'; 
import { toast, Toaster } from 'react-hot-toast'; // อย่าลืมลง npm install react-hot-toast

// 🌟 Import ไลบรารีสำหรับทำ PDF
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as htmlToImage from 'html-to-image';

// 🌟 Import Components
import WaterLevelChart from '@/components/WaterLevelChart';
import RecentLogs from '@/components/RecentLogs'; 

import { 
  Activity, CheckCircle2, ShieldAlert, AlertTriangle, 
  Database, Clock, Signal, Zap, Loader2, Download,
  Cloud, CloudRain, CloudLightning, Sun, MapPin,
  ArrowUpRight, ArrowDownRight, Minus, Wifi, WifiOff,
  BarChart3, Thermometer, Droplets, Waves, Smartphone, FileText, AlertOctagon
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
  const [selectedDeviceMac, setSelectedDeviceMac] = useState<string>('ALL'); 
  const [isMounted, setIsMounted] = useState(false);
  const [timeframe, setTimeframe] = useState('day');
  const { resolvedTheme } = useTheme();
  const [weather, setWeather] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);

  // 🔔 Ref สำหรับเก็บเวลาแจ้งเตือนล่าสุดของแต่ละ Node (ป้องกันการเด้งซ้ำซ้อน)
  const lastNotifiedRef = useRef<Record<string, number>>({});

  useEffect(() => { 
    setIsMounted(true); 
    // ขออนุญาตแจ้งเตือนบนเบราว์เซอร์
    if (typeof window !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

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
      const [logRes, devRes] = await Promise.all([
        fetch(`/api/flood?timeframe=${timeframe}&t=${t}`, { cache: 'no-store' }),
        fetch(`/api/settings?t=${t}`, { cache: 'no-store' }) 
      ]);
      
      if (logRes.ok) {
        const logData = await logRes.json();
        setLogs(Array.isArray(logData) ? logData : []);
      }
      
      if (devRes.ok) {
        const devData = await devRes.json();
        if (Array.isArray(devData)) {
          setDevices(devData);
        } else if (devData && typeof devData === 'object') {
          setDevices([devData]);
        } else {
          setDevices([]);
        }
      }
    } catch (err) { console.error("Fetch error:", err); }
  }, [timeframe, status]);

  // 🔔 ฟังก์ชันแจ้งเตือน Noti
  const triggerPushNotification = useCallback((name: string, level: number) => {
    // 1. แจ้งเตือนแบบ Toast ภายในแอป (สีแดงวิกฤต)
    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-in fade-in slide-in-from-top-4' : 'animate-out fade-out slide-out-to-top-2'} max-w-md w-full bg-red-600/90 backdrop-blur-xl shadow-2xl rounded-[1.5rem] pointer-events-auto flex border border-white/30 p-4 text-white`}>
        <div className="flex-1 w-0 p-1">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <AlertOctagon className="h-10 w-10 text-white animate-pulse" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70 text-white/80">Critical Alert Detected!</p>
              <p className="text-sm font-black mt-1 uppercase tracking-tight">Station: {name}</p>
              <p className="text-xs font-bold opacity-90">Current Level: {level.toFixed(2)} cm</p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-white/20">
          <button onClick={() => toast.dismiss(t.id)} className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-[10px] font-black uppercase hover:bg-white/10 transition-all">Dismiss</button>
        </div>
      </div>
    ), { duration: 8000 });

    // 2. แจ้งเตือนแบบเบราว์เซอร์ Push (กรณีพับจอ)
    if (Notification.permission === 'granted') {
      new Notification(`🚨 ระดับน้ำวิกฤต: ${name}`, {
        body: `ตรวจพบระดับน้ำ ${level.toFixed(2)} cm กรุณาตรวจสอบสถานการณ์ด่วน!`,
        icon: '/favicon.ico'
      });
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData(); 
      fetchWeather();
      const dataInterval = setInterval(fetchData, 5000); 
      const weatherInterval = setInterval(fetchWeather, 30 * 60000); 
      return () => { clearInterval(dataInterval); clearInterval(weatherInterval); };
    }
  }, [fetchData, status]);

  // 🔔 Effect สำหรับเช็คการแจ้งเตือนจากข้อมูลที่โหลดมาใหม่
  useEffect(() => {
    if (!logs.length || !devices.length) return;
    
    devices.forEach(device => {
      const deviceLogs = logs.filter(l => (l.mac || l.device_id) === device.mac);
      if (deviceLogs.length === 0) return;

      const latestLog = deviceLogs[deviceLogs.length - 1];
      const waterLevel = Number(latestLog.level || 0);
      const critThresh = device.criticalThreshold || 10;
      
      const now = Date.now();
      const lastTime = lastNotifiedRef.current[device.mac] || 0;

      // ถ้าเกินค่าวิกฤต และยังไม่ได้เตือนใน 5 นาทีที่ผ่านมา
      if (waterLevel >= critThresh && (now - lastTime > 5 * 60000)) {
        triggerPushNotification(device.name, waterLevel);
        lastNotifiedRef.current[device.mac] = now;
      }
    });
  }, [logs, devices, triggerPushNotification]);

  const calculateWater = useCallback((level: any) => {
    const raw = Number(level);
    return isNaN(raw) ? 0 : Math.max(0, raw);
  }, []);

  const activeLogs = useMemo(() => {
    if (!Array.isArray(logs) || logs.length === 0) return [];
    return selectedDeviceMac === 'ALL' ? logs : logs.filter(l => (l.mac || l.device_id) === selectedDeviceMac);
  }, [logs, selectedDeviceMac]);

  const avgStats = useMemo(() => {
    if (activeLogs.length === 0) return { level: 0, temp: 0, humid: 0 };
    const validLogs = activeLogs.filter(l => Number(l.level) < 150); 
    if (validLogs.length === 0) return { level: 0, temp: 0, humid: 0 };

    const sum = validLogs.reduce((acc, log) => ({
      level: acc.level + Number(log.level || 0),
      temp: acc.temp + Number(log.temperature || 0),
      humid: acc.humid + (Number(log.air_humidity || log.humidity || 0))
    }), { level: 0, temp: 0, humid: 0 });

    const count = validLogs.length;
    return {
      level: (sum.level / count).toFixed(2),
      temp: (sum.temp / count).toFixed(1),
      humid: (sum.humid / count).toFixed(1)
    };
  }, [activeLogs]);

  const isOffline = useMemo(() => {
    if (activeLogs.length === 0) return true;
    const lastLog = activeLogs[activeLogs.length - 1];
    const lastLogTime = new Date(lastLog.createdAt || lastLog.timestamp).getTime();
    return (Date.now() - lastLogTime) > 15 * 60 * 1000; 
  }, [activeLogs]);

  const waterInTank = useMemo(() => {
    if (activeLogs.length === 0) return 0;
    const lastEntry = activeLogs[activeLogs.length - 1];
    return calculateWater(lastEntry?.level);
  }, [activeLogs, calculateWater]);

  const activeThresholds = useMemo(() => {
    const safeDevices = Array.isArray(devices) ? devices : [];
    let d = safeDevices.find(d => d.mac === selectedDeviceMac);
    if (selectedDeviceMac === 'ALL' && activeLogs.length > 0) {
      d = safeDevices.find(dev => dev.mac === (activeLogs[activeLogs.length - 1].mac || activeLogs[activeLogs.length - 1].device_id));
    }
    return { warning: d?.warningThreshold ?? 2.8, critical: d?.criticalThreshold ?? 3.0, installHeight: d?.installHeight ?? 13.5 };
  }, [selectedDeviceMac, devices, activeLogs]);

  const systemStatus = useMemo(() => {
    if (activeLogs.length === 0) return { label: "NO DATA", state: "offline", color: "text-slate-400", bg: "bg-white/40 dark:bg-black/40 backdrop-blur-md", icon: <WifiOff size={32} className="text-slate-500"/>, border: "border-white/30 dark:border-white/10" };
    
    if (waterInTank >= activeThresholds.critical) {
      return { label: "DANGER", state: "danger", color: "text-red-600 dark:text-red-500", bg: "bg-red-500/80 backdrop-blur-md", icon: <ShieldAlert size={32} className="text-white"/>, border: "border-red-500/50" };
    }
    if (waterInTank >= activeThresholds.warning) {
      return { label: "WARNING", state: "warning", color: "text-orange-600 dark:text-orange-500", bg: "bg-orange-500/80 backdrop-blur-md", icon: <AlertTriangle size={32} className="text-white"/>, border: "border-orange-500/50" };
    }
    
    return { label: "STABLE", state: "safe", color: "text-emerald-600 dark:text-emerald-500", bg: "bg-emerald-500/80 backdrop-blur-md", icon: <CheckCircle2 size={32} className="text-white"/>, border: "border-emerald-500/50" };
  }, [waterInTank, activeThresholds, activeLogs.length]);

  const insights = useMemo(() => {
    if (activeLogs.length < 2) return { maxWater: 0, avgSignal: 0, rateOfChange: 0, timeToFlood: '-', lastUpdate: '-', percentToCritical: 0 };
    try {
      const latestLog = activeLogs[activeLogs.length - 1];
      const crit = activeThresholds.critical;
      const currentWater = calculateWater(latestLog.level);
      const validForMax = activeLogs.filter(l => Number(l.level) < 150);
      const maxWater = validForMax.length > 0 ? Math.max(...validForMax.map(l => calculateWater(l.level))) : 0;
      const latestTime = new Date(latestLog?.createdAt || Date.now()).getTime();
      const thirtyMinsAgo = latestTime - (30 * 60000);
      const oldLog = activeLogs.find(l => new Date(l.createdAt).getTime() >= thirtyMinsAgo) || activeLogs[0];
      const hourDiff = (latestTime - new Date(oldLog.createdAt).getTime()) / 3600000;
      const rate = hourDiff > 0 ? (currentWater - calculateWater(oldLog.level)) / hourDiff : 0;

      let timeStr = "Stable";
      if (rate > 0.05 && currentWater < crit) {
        const mins = Math.round(((crit - currentWater) / rate) * 60);
        timeStr = mins > 60 ? `Risk in ${Math.floor(mins/60)}h ${mins%60}m` : `Risk in ${mins}m`;
      } else if (currentWater >= crit) {
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
    } catch (e) { return { maxWater: 0, avgSignal: 0, rateOfChange: 0, timeToFlood: '-', lastUpdate: 'Error', percentToCritical: 0 }; }
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
    const safeDevices = Array.isArray(devices) ? devices : [];
    return safeDevices.filter(d => selectedDeviceMac === 'ALL' || d.mac === selectedDeviceMac).map(d => {
      const dLogs = logs.filter(l => (l.mac || l.device_id) === d.mac);
      if(dLogs.length === 0) return { ...d, currentLevel: 0, status: 'offline' };
      const last = dLogs[dLogs.length - 1];
      const lvl = calculateWater(last.level);
      let stat = 'safe';
      if(lvl >= (d.criticalThreshold ?? 3.0)) stat = 'danger';
      else if(lvl >= (d.warningThreshold ?? 2.8)) stat = 'warning';
      return { ...d, currentLevel: lvl, status: stat };
    });
  }, [devices, logs, selectedDeviceMac, calculateWater]);

  const isDark = resolvedTheme === 'dark';
  const currentDeviceDetail = devices.find(d => d.mac === selectedDeviceMac);
  const displayTrend = currentDeviceDetail?.trend !== undefined ? currentDeviceDetail.trend : insights.rateOfChange;

  const trendBadge = useMemo(() => {
    if (activeLogs.length === 0) return { text: "⏳ รอข้อมูล...", bg: "bg-slate-500/10 border-slate-500 text-slate-500" };
    if (displayTrend > 2.0) return { text: "🚨 ระดับน้ำกำลังเพิ่มขึ้นอย่างรวดเร็ว!", bg: "bg-red-500/10 border-red-500 text-red-600 dark:text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse" };
    if (displayTrend > 0.5) return { text: "📈 ระดับน้ำกำลังเพิ่มขึ้น", bg: "bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400" };
    if (displayTrend < -2.0) return { text: "📉 ระดับน้ำกำลังลดลงอย่างรวดเร็ว", bg: "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400" };
    if (displayTrend < -0.5) return { text: "↘️ ระดับน้ำกำลังลดลง", bg: "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400" };
    return { text: "➡️ ระดับน้ำทรงตัว (ปกติ)", bg: "bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400" };
  }, [displayTrend, activeLogs.length]);

  const exportToPDF = async () => {
    if (activeLogs.length === 0) return alert("No data available to export.");
    setIsExporting(true);

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const nodeName = selectedDeviceMac === 'ALL' ? 'All Stations Overview' : (devices.find(d => d.mac === selectedDeviceMac)?.name || selectedDeviceMac);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(17, 85, 250); 
      doc.text('Flood Monitoring Report', pageWidth / 2, 20, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); 
      doc.text(`Generated on: ${new Date().toLocaleString('en-GB')}`, pageWidth / 2, 28, { align: 'center' });
      
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 35, pageWidth - 14, 35);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59); 
      doc.text('System Overview', 14, 45);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Station Target: ${nodeName}`, 14, 53);
      doc.text(`Selected Timeframe: ${timeframe.toUpperCase()}`, 14, 59);
      doc.text(`Total Records Found: ${activeLogs.length}`, 14, 65);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Average Sensor Readings', 110, 45);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Water Level: ${avgStats.level} cm`, 110, 53);
      doc.text(`Temperature: ${avgStats.temp} °C`, 110, 59);
      doc.text(`Humidity: ${avgStats.humid} %`, 110, 65);

      const chartElem = document.getElementById('dashboard-chart-for-pdf');
      let currentY = 75;
      
      if (chartElem) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Trend Analysis Chart', 14, currentY);
        currentY += 5;
        
        await new Promise(resolve => setTimeout(resolve, 500)); 
        const chartImg = await htmlToImage.toPng(chartElem, { backgroundColor: '#ffffff', pixelRatio: 2 });
        doc.addImage(chartImg, 'PNG', 14, currentY, 180, 80);
        currentY += 90;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Detailed Logs (Latest Records)', 14, currentY);

      autoTable(doc, {
        startY: currentY + 5,
        head: [['Date/Time', 'Station', 'Level (cm)', 'Temp (°C)', 'Humid (%)', 'Signal', 'Status']],
        body: [...activeLogs].reverse().slice(0, 100).map(l => [
          new Date(l.createdAt || l.timestamp).toLocaleString('en-GB'),
          devices.find(d => d.mac === (l.mac || l.device_id))?.name || 'Unknown',
          Number(l.level || 0).toFixed(2),
          Number(l.temperature || 0).toFixed(1),
          Number(l.air_humidity || l.humidity || 0).toFixed(1),
          l.signal || 0,
          l.status || 'STABLE'
        ]),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [17, 85, 250], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 }
      });

      doc.save(`Flood_Report_${nodeName.replace(/\s+/g, '_')}_${timeframe}_${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
      alert('Failed to generate PDF report. Please try again.');
    } finally {
      setIsExporting(false);
    }
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

  const weatherDetails = weather ? getWeatherIcon(weather.weathercode) : null;

  return (
    <div className="min-h-screen font-sans pb-24 md:pb-10 relative overflow-hidden transition-colors duration-300">
      
      {/* 🔔 Notification Component */}
      <Toaster position="top-right" reverseOrder={false} />

      <div className="fixed inset-0 -z-10 bg-[#0f172a]">
        <img src="https://images.pexels.com/photos/1295138/pexels-photo-1295138.jpeg" className="w-full h-full object-cover opacity-100" alt="background" />
        <div className="absolute inset-0 bg-slate-100/50 dark:bg-black/70 backdrop-blur-[40px] transition-colors duration-500" />
      </div>

      <main className="max-w-[1600px] mx-auto p-4 sm:p-6 space-y-6 relative z-10">
        
        {/* แถบเลือก Node (Scroll แนวนอนได้) */}
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar snap-x">
          <button
            onClick={() => setSelectedDeviceMac('ALL')}
            className={`snap-start flex-shrink-0 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border ${
              selectedDeviceMac === 'ALL'
                ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/30'
                : 'bg-white/40 dark:bg-black/40 text-slate-500 border-white/20 hover:bg-white/60'
            } backdrop-blur-md`}
          >
            All Stations Overview
          </button>
          {Array.isArray(devices) && devices.map((dev) => {
            const isOfflineStatus = (Date.now() - new Date(dev.lastPing || Date.now()).getTime()) > 15 * 60 * 1000;
            const isDanger = dev.waterLevel >= (dev.criticalThreshold || 10);
            return (
              <button
                key={dev.mac}
                onClick={() => setSelectedDeviceMac(dev.mac)}
                className={`snap-start flex-shrink-0 px-5 py-3 rounded-2xl flex items-center gap-3 transition-all border backdrop-blur-md ${
                  selectedDeviceMac === dev.mac ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white/80 dark:bg-black/60 shadow-lg' : 'border-white/20 bg-white/40 dark:bg-black/40 hover:bg-white/60'
                }`}
              >
                <div className={`w-3 h-3 rounded-full shadow-sm ${isOfflineStatus ? 'bg-slate-400' : isDanger ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                <div className="text-left">
                  <p className={`text-[10px] font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>{dev.name || 'Unknown Node'}</p>
                  <p className="text-[9px] font-bold text-slate-500">Lv: {Number(dev.waterLevel || 0).toFixed(1)} cm</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Header & Current Status */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className={`lg:col-span-8 p-6 sm:p-8 rounded-[2.5rem] shadow-2xl flex flex-col justify-between relative overflow-hidden transition-all backdrop-blur-xl ${isDark ? 'bg-[#1C1C1E]/60 border border-white/10' : 'bg-white/60 border border-white/50'}`}>
            
            <div className={`mb-6 w-fit px-5 py-2.5 rounded-2xl border-2 font-black text-sm md:text-base tracking-wide flex items-center gap-2 transition-all ${trendBadge.bg}`}>
               {trendBadge.text}
            </div>

            <div className="flex justify-between items-start relative z-10">
               <div>
                  <h2 className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest mb-2 flex items-center gap-2">
                    {selectedDeviceMac === 'ALL' ? 'Live Water Level (Average)' : `Live Water Level : ${currentDeviceDetail?.name || ''}`}
                    {isOffline && activeLogs.length > 0 && <span className="px-2 py-0.5 rounded text-[9px] bg-red-500/20 text-red-600 dark:text-red-400 backdrop-blur-md">OFFLINE</span>}
                  </h2>
                  <div className="flex items-baseline gap-2 drop-shadow-sm">
                     <span className={`text-6xl sm:text-7xl font-black tabular-nums tracking-tighter ${activeLogs.length === 0 ? 'text-slate-400/50' : isDark ? 'text-white' : 'text-slate-800'}`}>
                       {activeLogs.length > 0 ? waterInTank.toFixed(2) : '-.--'}
                     </span>
                     <span className="text-xl sm:text-2xl font-bold text-slate-500 dark:text-slate-400">cm</span>
                  </div>
               </div>
               
               <div className="flex flex-col items-end gap-2">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full border shadow-sm ${systemStatus.bg} ${systemStatus.border}`}>
                     {systemStatus.icon}
                     <span className={`font-black tracking-widest text-sm pr-1 ${activeLogs.length === 0 ? 'text-slate-500' : 'text-white drop-shadow-md'}`}>{systemStatus.label}</span>
                  </div>
                  
                  {selectedDeviceMac !== 'ALL' && currentDeviceDetail && (
                    <div className="flex gap-2">
                      <div className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border bg-white/40 dark:bg-black/40 border-white/20 backdrop-blur-md flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Signal size={12} className={currentDeviceDetail.signal > 10 ? "text-emerald-500" : "text-red-500"} />
                        {currentDeviceDetail.signal || 0} CSQ
                      </div>
                      <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border backdrop-blur-md flex items-center gap-1.5 ${
                        currentDeviceDetail.isSmsEnabled 
                          ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30' 
                          : 'bg-slate-500/10 text-slate-500 border-slate-500/30'
                      }`}>
                        <Smartphone size={12} /> SMS Alert: {currentDeviceDetail.isSmsEnabled ? 'ON' : 'OFF'}
                      </div>
                    </div>
                  )}
               </div>
            </div>

            <div className={`mt-8 pt-6 border-t relative z-10 flex flex-wrap gap-6 items-center ${isDark ? 'border-white/10' : 'border-slate-300/30'}`}>
               <div className="flex items-center gap-2">
                 <div className={`flex items-center justify-center w-8 h-8 rounded-full shadow-sm backdrop-blur-md ${activeLogs.length === 0 ? 'bg-white/40 dark:bg-black/40 text-slate-400' : displayTrend > 0.05 ? 'bg-red-500/20 text-red-600 dark:text-red-400' : displayTrend < -0.05 ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-white/40 dark:bg-black/40 text-slate-500 dark:text-slate-300'}`}>
                   {displayTrend > 0.05 ? <ArrowUpRight size={18}/> : displayTrend < -0.05 ? <ArrowDownRight size={18}/> : <Minus size={18}/>}
                 </div>
                 <div>
                   <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase drop-shadow-sm">Trend Value</p>
                   <p className={`text-sm font-black drop-shadow-sm ${activeLogs.length === 0 ? 'text-slate-400' : isDark?'text-slate-200':'text-slate-800'}`}>
                     {activeLogs.length === 0 ? '-' : `${displayTrend > 0 ? '+' : ''}${displayTrend.toFixed(2)} cm/h`}
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

        {/* Current Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
           <StatCard icon={<Activity />} label="Highest" value={activeLogs.length > 0 ? insights.maxWater.toFixed(2) : '-'} unit="cm" isDark={isDark} />
           <StatCard icon={signalStatus.icon} label="Signal Status" value={signalStatus.label} valueColor={signalStatus.color} isDark={isDark} />
           <StatCard icon={<Database />} label="Records" value={activeLogs.length} unit="logs" isDark={isDark} />
           <StatCard icon={<Clock />} label="Update" value={insights.lastUpdate} isDark={isDark} />
        </div>

        {/* Quick Average Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-5 rounded-3xl border transition-all ${isDark ? 'bg-blue-500/10 border-blue-500/20 shadow-[0_8px_30px_rgb(59,130,246,0.1)]' : 'bg-blue-50 border-blue-100 shadow-sm'}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500 rounded-lg text-white"><Waves size={16} /></div>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Avg Water Level</p>
            </div>
            <p className={`text-3xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>{avgStats.level} <span className="text-xs font-bold text-slate-500">cm</span></p>
            <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">Based on selected {timeframe}</p>
          </div>

          <div className={`p-5 rounded-3xl border transition-all ${isDark ? 'bg-orange-500/10 border-orange-500/20 shadow-[0_8px_30px_rgb(249,115,22,0.1)]' : 'bg-orange-50 border-orange-100 shadow-sm'}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-500 rounded-lg text-white"><Thermometer size={16} /></div>
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Avg Temperature</p>
            </div>
            <p className={`text-3xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>{avgStats.temp} <span className="text-xs font-bold text-slate-500">°C</span></p>
            <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">Based on selected {timeframe}</p>
          </div>

          <div className={`p-5 rounded-3xl border transition-all ${isDark ? 'bg-emerald-500/10 border-emerald-500/20 shadow-[0_8px_30px_rgb(16,185,129,0.1)]' : 'bg-emerald-50 border-emerald-100 shadow-sm'}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-500 rounded-lg text-white"><Droplets size={16} /></div>
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Avg Humidity</p>
            </div>
            <p className={`text-3xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>{avgStats.humid} <span className="text-xs font-bold text-slate-500">%</span></p>
            <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">Based on selected {timeframe}</p>
          </div>
        </div>

        {/* History Chart Section */}
        <div className={`p-6 rounded-[2.5rem] shadow-2xl backdrop-blur-xl transition-all ${isDark ? 'bg-[#1C1C1E]/60 border border-white/10' : 'bg-white/60 border border-white/50'}`}>
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
             <div>
                <h3 className="font-bold text-sm uppercase tracking-widest text-slate-600 dark:text-slate-300 drop-shadow-sm mb-1 flex items-center gap-2">
                   <BarChart3 size={18} className="text-blue-500" /> Sensor History
                </h3>
                <Link href="/analytics" className="text-[10px] font-black text-blue-500 hover:text-blue-600 flex items-center gap-1 transition-all group">
                   VIEW FULL ANALYTICS <ArrowUpRight size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>
             </div>
             
             <div className="flex flex-col sm:flex-row gap-3">
               <div className={`flex p-1 rounded-xl shadow-inner backdrop-blur-md ${isDark ? 'bg-black/40 border border-white/5' : 'bg-slate-200/50 border border-white/40'}`}>
                 {['day', 'week', 'month', 'year'].map(t => (
                   <button key={t} onClick={() => setTimeframe(t)} className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all ${timeframe === t ? (isDark ? 'bg-blue-600/80 text-white shadow-md' : 'bg-white shadow-md text-blue-600') : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                     {t === 'year' ? '1Y' : t.toUpperCase()}
                   </button>
                 ))}
               </div>
               
               {/* 🌟 ปุ่ม EXPORT PDF */}
               <button 
                 onClick={exportToPDF}
                 disabled={isExporting || activeLogs.length === 0}
                 className="flex items-center gap-2 px-4 py-2 bg-blue-600/90 hover:bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {isExporting ? <Loader2 size={14} className="animate-spin"/> : <FileText size={14} />}
                 {isExporting ? 'Generating...' : 'Export PDF'}
               </button>
             </div>
           </div>
           
           <div className="h-[350px]">
              <WaterLevelChart data={activeLogs} isDark={isDark} devices={devices} timeframe={timeframe} selectedDeviceMac={selectedDeviceMac} />
           </div>
        </div>

        {/* Map & Logs Section */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
           <div className={`xl:col-span-7 h-[500px] rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-xl transition-all ${isDark ? 'border border-white/10' : 'border border-white/50'}`}>
              <DeviceMap devices={mapDevices} selectedMac={selectedDeviceMac} />
           </div>

           <div className={`xl:col-span-5 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[500px] backdrop-blur-xl transition-all ${isDark ? 'bg-[#1C1C1E]/60 border border-white/10' : 'bg-white/60 border border-white/50'}`}>
              <div className={`p-5 border-b flex justify-between items-center backdrop-blur-md ${isDark ? 'border-white/10 bg-black/20' : 'border-slate-300/30 bg-white/40'}`}>
                 <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800 dark:text-white drop-shadow-sm">System Logs</h3>
              </div>
              <div className="flex-grow overflow-auto p-2">
                 <RecentLogs logs={activeLogs} devices={devices} />
              </div>
           </div>
        </div>

      </main>

      {/* 🌟 ซ่อนกราฟไว้หลังบ้าน สำหรับถ่ายภาพลง PDF */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '800px', height: '400px', zIndex: -1 }}>
        <div id="dashboard-chart-for-pdf" className="bg-white p-8">
            <h2 className="text-center font-bold text-xl mb-4 text-black uppercase tracking-widest">Trend Analysis ({timeframe})</h2>
            <div className="h-[300px]">
              <WaterLevelChart data={activeLogs} timeframe={timeframe} isDark={false} devices={devices} selectedDeviceMac={selectedDeviceMac} />
            </div>
        </div>
      </div>

    </div>
  );
}

function StatCard({ icon, label, value, unit, isDark, valueColor }: any) {
  return (
    <div className={`p-6 rounded-[2.5rem] shadow-2xl transition-all backdrop-blur-xl hover:scale-[1.02] cursor-default ${isDark ? 'bg-[#1C1C1E]/60 border border-white/10' : 'bg-white/60 border border-white/50'}`}>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-sm backdrop-blur-md ${isDark ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' : 'bg-white/80 text-[#1155FA] border border-white'}`}>{icon}</div>
      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest drop-shadow-sm">{label}</div>
      <div className={`text-2xl font-black mt-1 tabular-nums tracking-tight drop-shadow-sm ${valueColor ? valueColor : isDark ? 'text-white' : 'text-slate-800'}`}>
        {value} <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium ml-0.5">{unit}</span>
      </div>
    </div>
  );
}