'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, Cell 
} from 'recharts';
import { 
  TrendingUp, ArrowLeft, Activity, Calendar, 
  Layers, BarChart3, PieChart, Zap,
  ShieldAlert, CheckCircle2, Waves, Thermometer, Droplets, Download, ArrowUpRight, Loader2
} from 'lucide-react';
import Link from 'next/link';

export default function AnalyticsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('month');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/flood?timeframe=${timeframe}`)
      .then(res => res.json())
      .then(json => {
        setData(Array.isArray(json) ? json : []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Fetch error:", err);
        setLoading(false);
      });
  }, [timeframe]);

  // 📊 ประมวลผลข้อมูลรายวัน
  const dailySummary = useMemo(() => {
    if (!data.length) return [];
    const groups: any = {};
    
    data.forEach(log => {
      const d = new Date(log.createdAt);
      const dateKey = d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
      if (!groups[dateKey]) {
        groups[dateKey] = { 
          date: dateKey, 
          level: [], 
          temp: [], 
          humid: [], 
          count: 0, 
          timestamp: d.getTime() 
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
  }, [data]);

  // 📈 สรุปค่าทางสถิติ
  const stats = useMemo(() => {
    if (!data.length) return { criticals: 0, avgLevel: "0.00", safeDays: 0, maxEver: 0 };
    const criticals = data.filter(d => d.status === 'CRITICAL').length;
    const allLevels = data.map(d => Number(d.level || 0)).filter(v => v < 150);
    const avg = allLevels.reduce((a, b) => a + b, 0) / allLevels.length;
    const safeDays = dailySummary.filter(d => Number(d.maxLevel) < 10).length;

    return {
      criticals,
      avgLevel: avg.toFixed(2),
      safeDays,
      maxEver: allLevels.length ? Math.max(...allLevels).toFixed(2) : "0.00"
    };
  }, [data, dailySummary]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-[#0B1121] gap-4">
      <Loader2 className="animate-spin text-blue-500" size={40} />
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Processing Analytics...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1121] p-4 md:p-8 transition-colors duration-500">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <Link href="/" className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:scale-105 transition-all">
              <ArrowLeft size={20} className="dark:text-white" />
            </Link>
            <div>
              <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter italic uppercase">Analytics</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full italic flex items-center gap-1">
                  <Zap size={12}/> Detailed Insights
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            {['week', 'month', 'year'].map((t) => (
              <button 
                key={t} onClick={() => setTimeframe(t)}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeframe === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* 🌟 Row 1: Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard label="Total Criticals" value={stats.criticals} sub="Events detected" icon={<ShieldAlert className="text-red-500"/>} />
          <StatCard label="Avg. Water Level" value={`${stats.avgLevel} cm`} sub="Period average" icon={<Waves className="text-blue-500"/>} />
          <StatCard label="Max Peak" value={`${stats.maxEver} cm`} sub="Highest recorded" icon={<TrendingUp className="text-orange-500"/>} />
          <StatCard label="Stability" value={`${stats.safeDays} Days`} sub="Below warning level" icon={<CheckCircle2 className="text-emerald-500"/>} />
        </div>

        {/* 🌟 Row 2: Charts & Intelligence */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-8 bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs mb-8 flex items-center gap-2">
              <Layers size={18} className="text-blue-500" /> Water Level Distribution (Daily Avg)
            </h3>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailySummary}>
                  <defs>
                    <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                  <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
                  <Area type="monotone" dataKey="avgLevel" stroke="#3b82f6" strokeWidth={4} fill="url(#colorAvg)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="xl:col-span-4 bg-[#1155FA] p-10 rounded-[3rem] text-white shadow-2xl flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="font-black uppercase tracking-widest text-[10px] opacity-60 mb-4 flex items-center gap-2">
                <Zap size={14} /> AI Strategic Summary
              </h3>
              <p className="text-2xl font-bold leading-tight italic tracking-tighter">
                {Number(stats.avgLevel) > 5 
                  ? `"พบบันทึกระดับน้ำเฉลี่ยสูงกว่าปกติในช่วงนี้ แนะนำให้ตรวจสอบท่อระบายน้ำบริเวณสถานีหลัก เพื่อป้องกันการเอ่อล้น"`
                  : `"สถานะโดยรวมในรอบ ${timeframe} นี้ยังมีความเสถียรสูง ไม่พบสัญญาณบ่งชี้ความเสี่ยงน้ำท่วมฉับพลัน"`}
              </p>
            </div>
            <div className="mt-8 relative z-10 bg-white/10 p-5 rounded-[2rem] border border-white/10 backdrop-blur-xl">
              <div className="flex justify-between items-center mb-2 text-[10px] font-black uppercase tracking-widest">
                <span>Model Accuracy</span>
                <span>94%</span>
              </div>
              <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white w-[94%] rounded-full"></div>
              </div>
            </div>
            <BarChart3 className="absolute -right-16 -bottom-16 size-64 text-white/5 -rotate-12" />
          </div>
        </div>

        {/* 🌟 Row 3: Daily Table */}
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-black/10">
            <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-500" /> Daily Statistics Table
            </h3>
            <button className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20"><Download size={16}/></button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50 dark:border-white/5">
                  <th className="px-8 py-6">Date Period</th>
                  <th className="px-8 py-6">Avg Level</th>
                  <th className="px-8 py-6">Peak Level</th>
                  <th className="px-8 py-6">Avg Temp</th>
                  <th className="px-8 py-6">Avg Humid</th>
                </tr>
              </thead>
              <tbody className="text-sm font-bold">
                {dailySummary.map((row, i) => (
                  <tr key={i} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-8 py-6 dark:text-slate-300 italic">{row.date}</td>
                    <td className="px-8 py-6 text-blue-600 dark:text-blue-400">{row.avgLevel} cm</td>
                    <td className="px-8 py-6 text-red-500">{row.maxLevel} cm</td>
                    <td className="px-8 py-6 dark:text-slate-400">{row.avgTemp}°C</td>
                    <td className="px-8 py-6 dark:text-slate-400">{row.avgHumid}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 p-7 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:-translate-y-1 transition-all duration-300">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
          <h4 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter italic">{value}</h4>
          <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase opacity-70">{sub}</p>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">{icon}</div>
      </div>
    </div>
  );
}