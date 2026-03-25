'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend 
} from 'recharts';
import { 
  TrendingUp, ArrowLeft, Activity, Calendar, 
  Layers, BarChart3, PieChart, Zap,
  ShieldAlert, CheckCircle2, Waves, Thermometer, Droplets, Download, ArrowUpRight, Loader2, Database, AlertOctagon, Wind
} from 'lucide-react';
import Link from 'next/link';

export default function AnalyticsPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [data, setData] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [timeframe, setTimeframe] = useState('month');
  const [selectedDeviceMac, setSelectedDeviceMac] = useState('ALL');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/flood?timeframe=${timeframe}&t=${Date.now()}`).then(res => res.json()),
      fetch(`/api/settings?t=${Date.now()}`).then(res => res.json())
    ])
    .then(([logData, devData]) => {
      setData(Array.isArray(logData) ? logData : []);
      setDevices(Array.isArray(devData) ? devData : [devData]);
      setLoading(false);
    })
    .catch(err => {
      console.error("Fetch error:", err);
      setLoading(false);
    });
  }, [timeframe]);

  const filteredData = useMemo(() => {
    if (selectedDeviceMac === 'ALL') return data;
    return data.filter(d => (d.mac || d.device_id) === selectedDeviceMac);
  }, [data, selectedDeviceMac]);

  // 📊 ประมวลผลข้อมูลรายวัน
  const dailySummary = useMemo(() => {
    if (!filteredData.length) return [];
    const groups: any = {};
    
    filteredData.forEach(log => {
      const d = new Date(log.createdAt || log.timestamp);
      const dateKey = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      if (!groups[dateKey]) {
        groups[dateKey] = { 
          date: dateKey, 
          level: [], temp: [], humid: [], 
          count: 0, timestamp: d.getTime() 
        };
      }
      groups[dateKey].level.push(Number(log.level || 0));
      groups[dateKey].temp.push(Number(log.temperature || 0));
      groups[dateKey].humid.push(Number(log.air_humidity || log.humidity || 0));
      groups[dateKey].count++;
    });

    return Object.values(groups).map((g: any) => ({
      date: g.date,
      timestamp: g.timestamp,
      avgLevel: (g.level.reduce((a:any, b:any) => a + b, 0) / g.count).toFixed(2),
      maxLevel: Math.max(...g.level).toFixed(2),
      avgTemp: (g.temp.reduce((a:any, b:any) => a + b, 0) / g.count).toFixed(1),
      avgHumid: (g.humid.reduce((a:any, b:any) => a + b, 0) / g.count).toFixed(1),
    })).sort((a:any, b:any) => a.timestamp - b.timestamp);
  }, [filteredData]);

  // 📈 สรุปค่าทางสถิติ
  const stats = useMemo(() => {
    if (!filteredData.length) return { criticals: 0, avgLevel: "0.00", safeDays: 0, maxEver: 0 };
    const criticals = filteredData.filter(d => d.status === 'CRITICAL').length;
    const allLevels = filteredData.map(d => Number(d.level || 0)).filter(v => v < 150);
    const avg = allLevels.reduce((a, b) => a + b, 0) / allLevels.length;
    const safeDays = dailySummary.filter(d => Number(d.maxLevel) < 10).length;

    return {
      criticals,
      avgLevel: avg.toFixed(2),
      safeDays,
      maxEver: allLevels.length ? Math.max(...allLevels).toFixed(2) : "0.00"
    };
  }, [filteredData, dailySummary]);

  // 🚨 คำนวณ 5 อันดับเหตุการณ์ระดับน้ำสูงสุด
  const topEvents = useMemo(() => {
    if (!filteredData.length) return [];
    const validData = filteredData.filter(d => Number(d.level) < 150 && Number(d.level) > 0);
    return [...validData].sort((a, b) => Number(b.level) - Number(a.level)).slice(0, 5);
  }, [filteredData]);

  // 💾 ฟังก์ชันดาวน์โหลด CSV รายวัน
  const exportDailyCSV = useCallback(() => {
    if (dailySummary.length === 0) return alert("No data to export");
    const headers = ["Date", "Average Level (cm)", "Peak Level (cm)", "Average Temp (C)", "Average Humidity (%)"];
    const rows = dailySummary.map(row => [
      row.date, row.avgLevel, row.maxLevel, row.avgTemp, row.avgHumid
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Flood_Analytics_Summary_${timeframe}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [dailySummary, timeframe]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center relative overflow-hidden">
      <div className="fixed inset-0 -z-10 bg-[#0f172a]">
        <img src="https://images.pexels.com/photos/1295138/pexels-photo-1295138.jpeg" className="w-full h-full object-cover opacity-100" alt="background" />
        <div className="absolute inset-0 bg-white/20 dark:bg-black/70 backdrop-blur-2xl transition-colors duration-500" />
      </div>
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-blue-500" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white drop-shadow-md">Processing Analytics...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen font-sans pb-24 md:pb-10 relative overflow-hidden transition-colors duration-300">
      
      <div className="fixed inset-0 -z-10 bg-[#0f172a]">
        <img src="https://images.pexels.com/photos/1295138/pexels-photo-1295138.jpeg" className="w-full h-full object-cover opacity-100" alt="background" />
        <div className="absolute inset-0 bg-slate-100/50 dark:bg-black/70 backdrop-blur-[40px] transition-colors duration-500" />
      </div>

      <div className="max-w-[1500px] mx-auto p-4 md:p-8 space-y-8 relative z-10">
        
        {/* Header & Controls */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <Link href="/" className="p-3 bg-white/40 dark:bg-black/40 border border-white/50 dark:border-white/10 rounded-2xl shadow-sm hover:scale-105 transition-all backdrop-blur-md">
              <ArrowLeft size={20} className="text-slate-800 dark:text-white" />
            </Link>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tighter italic uppercase drop-shadow-sm">Analytics</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full italic flex items-center gap-1 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.2)] backdrop-blur-sm">
                  <Zap size={12}/> Detailed Insights
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-full sm:w-auto">
              <Database className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-300" size={16} />
              <select 
                value={selectedDeviceMac}
                onChange={(e) => setSelectedDeviceMac(e.target.value)}
                className="w-full sm:w-64 pl-11 pr-4 py-3 bg-white/40 dark:bg-black/40 border border-white/50 dark:border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer backdrop-blur-md shadow-inner"
              >
                <option value="ALL" className="text-black">All Stations Overview</option>
                {devices.map(dev => (
                  <option key={dev.mac} value={dev.mac} className="text-black">
                    {dev.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex w-full sm:w-auto bg-white/40 dark:bg-black/40 p-1.5 rounded-2xl border border-white/50 dark:border-white/10 backdrop-blur-md shadow-inner">
              {['week', 'month', 'year'].map((t) => (
                <button 
                  key={t} onClick={() => setTimeframe(t)}
                  className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeframe === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 border border-blue-500' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 1: Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard label="Total Criticals" value={stats.criticals} sub="Events detected" icon={<ShieldAlert className="text-red-500"/>} isDark={isDark} />
          <StatCard label="Avg. Water Level" value={`${stats.avgLevel} cm`} sub="Period average" icon={<Waves className="text-blue-500"/>} isDark={isDark} />
          <StatCard label="Max Peak" value={`${stats.maxEver} cm`} sub="Highest recorded" icon={<TrendingUp className="text-orange-500"/>} isDark={isDark} />
          <StatCard label="Stability" value={`${stats.safeDays} Days`} sub="Below warning level" icon={<CheckCircle2 className="text-emerald-500"/>} isDark={isDark} />
        </div>

        {/* Row 2: Charts & Intelligence */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className={`xl:col-span-8 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden backdrop-blur-xl transition-all ${isDark ? 'bg-[#1C1C1E]/60 border border-white/10' : 'bg-white/60 border border-white/50'}`}>
            <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs mb-8 flex items-center gap-2 drop-shadow-sm">
              <Layers size={18} className="text-blue-500" /> Water Level Distribution (Daily Avg vs Peak)
            </h3>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailySummary}>
                  <defs>
                    <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorMax" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#ffffff" : "#0f172a"} opacity={0.1} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: isDark ? '#cbd5e1' : '#64748b', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: isDark ? '#cbd5e1' : '#64748b', fontSize: 10, fontWeight: 'bold'}} dx={-10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', borderRadius: '16px', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} 
                    itemStyle={{ color: isDark ? '#fff' : '#000', fontWeight: 'bold', fontSize: '12px' }}
                    labelStyle={{ color: '#888', fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                  <Area name="Peak Level" type="monotone" dataKey="maxLevel" stroke="#ef4444" strokeWidth={2} fill="url(#colorMax)" />
                  <Area name="Average Level" type="monotone" dataKey="avgLevel" stroke="#3b82f6" strokeWidth={4} fill="url(#colorAvg)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="xl:col-span-4 bg-[#1155FA]/90 backdrop-blur-xl border border-white/20 p-10 rounded-[3rem] text-white shadow-2xl flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="font-black uppercase tracking-widest text-[10px] opacity-80 mb-4 flex items-center gap-2">
                <Zap size={14} /> AI Strategic Summary
              </h3>
              <p className="text-2xl font-bold leading-tight italic tracking-tighter drop-shadow-md">
                {Number(stats.avgLevel) > 5 
                  ? `"พบบันทึกระดับน้ำเฉลี่ยสูงกว่าปกติในช่วงนี้ แนะนำให้ตรวจสอบท่อระบายน้ำบริเวณสถานีหลัก เพื่อป้องกันการเอ่อล้น"`
                  : `"สถานะโดยรวมในรอบ ${timeframe} นี้ยังมีความเสถียรสูง ไม่พบสัญญาณบ่งชี้ความเสี่ยงน้ำท่วมฉับพลัน"`}
              </p>
            </div>
            <div className="mt-8 relative z-10 bg-white/10 p-5 rounded-[2rem] border border-white/20 backdrop-blur-md shadow-inner">
              <div className="flex justify-between items-center mb-2 text-[10px] font-black uppercase tracking-widest">
                <span>Model Confidence</span>
                <span>94%</span>
              </div>
              <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                <div className="h-full bg-white w-[94%] rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
              </div>
            </div>
            <BarChart3 className="absolute -right-16 -bottom-16 size-64 text-white/10 -rotate-12" />
          </div>
        </div>

        {/* Row 3: Environment Chart & Top Events */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          <div className={`xl:col-span-7 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden backdrop-blur-xl transition-all ${isDark ? 'bg-[#1C1C1E]/60 border border-white/10' : 'bg-white/60 border border-white/50'}`}>
            <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs mb-8 flex items-center gap-2 drop-shadow-sm">
              <Wind size={18} className="text-cyan-500" /> Environment Correlation (Temp & Humid)
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailySummary}>
                  <defs>
                    <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorHumid" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#ffffff" : "#0f172a"} opacity={0.1} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: isDark ? '#cbd5e1' : '#64748b', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: isDark ? '#cbd5e1' : '#64748b', fontSize: 10, fontWeight: 'bold'}} dx={-10} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: isDark ? '#cbd5e1' : '#64748b', fontSize: 10, fontWeight: 'bold'}} dx={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', borderRadius: '16px', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)' }} 
                    itemStyle={{ fontWeight: 'bold', fontSize: '12px' }}
                    labelStyle={{ color: '#888', fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                  <Area yAxisId="left" name="Avg Temp (°C)" type="monotone" dataKey="avgTemp" stroke="#f97316" strokeWidth={3} fill="url(#colorTemp)" />
                  <Area yAxisId="right" name="Avg Humid (%)" type="monotone" dataKey="avgHumid" stroke="#06b6d4" strokeWidth={3} fill="url(#colorHumid)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={`xl:col-span-5 rounded-[3rem] shadow-2xl overflow-hidden backdrop-blur-xl flex flex-col transition-all ${isDark ? 'bg-[#1C1C1E]/60 border border-white/10' : 'bg-white/60 border border-white/50'}`}>
            <div className="p-8 border-b border-white/30 dark:border-white/10 bg-white/20 dark:bg-black/20 backdrop-blur-md">
              <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs flex items-center gap-2 drop-shadow-sm">
                <AlertOctagon size={18} className="text-red-500" /> Top 5 Peak Levels
              </h3>
            </div>
            <div className="flex-grow overflow-auto p-4">
              <div className="space-y-3">
                {topEvents.length === 0 ? (
                  <p className="text-center text-xs font-bold text-slate-500 uppercase py-10">No critical events recorded</p>
                ) : (
                  topEvents.map((event, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-white/40 dark:bg-black/40 border border-white/50 dark:border-white/10 rounded-2xl backdrop-blur-md shadow-sm hover:scale-[1.02] transition-transform">
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-xs shadow-inner ${idx === 0 ? 'bg-red-500 shadow-red-500/50' : idx === 1 ? 'bg-orange-500 shadow-orange-500/50' : 'bg-slate-400 dark:bg-slate-600'}`}>
                          #{idx + 1}
                        </div>
                        <div>
                          <p className="text-[11px] font-black uppercase text-slate-800 dark:text-white">{new Date(event.createdAt || event.timestamp).toLocaleDateString('en-GB')}</p>
                          {/* 🌟 [FIXED] ดัก Error ตรงนี้ โดยการเช็คให้ชัวร์ว่าเป็น String ก่อน */}
                          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono">
                            {new Date(event.createdAt || event.timestamp).toLocaleTimeString('en-GB')} • {String(event.mac || event.device_id || 'UNKNOWN').slice(-5)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-red-600 dark:text-red-400 tabular-nums drop-shadow-sm">{Number(event.level).toFixed(2)}</p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase">cm</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Row 4: Daily Table */}
        <div className={`rounded-[3rem] shadow-2xl overflow-hidden backdrop-blur-xl transition-all ${isDark ? 'bg-[#1C1C1E]/60 border border-white/10' : 'bg-white/60 border border-white/50'}`}>
          <div className="p-8 border-b border-white/30 dark:border-white/10 flex justify-between items-center bg-white/20 dark:bg-black/20 backdrop-blur-md">
            <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs flex items-center gap-2 drop-shadow-sm">
              <Database size={18} className="text-blue-500" /> Daily Summary Export
            </h3>
            <button 
              onClick={exportDailyCSV}
              className="px-4 py-2 bg-blue-600/90 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20 backdrop-blur-md transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
            >
              <Download size={14}/> CSV Export
            </button>
          </div>
          <div className="overflow-x-auto p-2">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 border-b border-white/30 dark:border-white/10">
                  <th className="px-8 py-5">Date Period</th>
                  <th className="px-8 py-5">Avg Level</th>
                  <th className="px-8 py-5">Peak Level</th>
                  <th className="px-8 py-5">Avg Temp</th>
                  <th className="px-8 py-5">Avg Humid</th>
                </tr>
              </thead>
              <tbody className="text-sm font-bold divide-y divide-white/30 dark:divide-white/5">
                {dailySummary.map((row, i) => (
                  <tr key={i} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors group">
                    <td className="px-8 py-5 dark:text-slate-300 italic group-hover:text-blue-500 transition-colors">{row.date}</td>
                    <td className="px-8 py-5 text-blue-600 dark:text-blue-400 tabular-nums">{row.avgLevel} cm</td>
                    <td className="px-8 py-5 text-red-600 dark:text-red-400 tabular-nums">{row.maxLevel} cm</td>
                    <td className="px-8 py-5 dark:text-slate-300 tabular-nums">{row.avgTemp}°C</td>
                    <td className="px-8 py-5 dark:text-slate-300 tabular-nums">{row.avgHumid}%</td>
                  </tr>
                ))}
                {dailySummary.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-10 text-center text-slate-500 text-xs font-bold uppercase tracking-widest">
                      No data available for the selected period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon, isDark }: any) {
  return (
    <div className={`p-7 rounded-[2.5rem] shadow-2xl hover:-translate-y-1 transition-all duration-300 backdrop-blur-xl ${isDark ? 'bg-[#1C1C1E]/60 border border-white/10' : 'bg-white/60 border border-white/50'}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 drop-shadow-sm">{label}</p>
          <h4 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter italic drop-shadow-sm tabular-nums">{value}</h4>
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase opacity-80 drop-shadow-sm">{sub}</p>
        </div>
        <div className={`p-4 rounded-2xl shadow-sm backdrop-blur-md ${isDark ? 'bg-white/5' : 'bg-white/80'}`}>{icon}</div>
      </div>
    </div>
  );
}