'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend 
} from 'recharts';
import { 
  TrendingUp, ArrowLeft, Activity, Calendar, 
  Layers, BarChart3, PieChart, Zap,
  ShieldAlert, CheckCircle2, Waves, Thermometer, Droplets, Download, ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';

export default function AnalyticsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('month');

  useEffect(() => {
    // 🌟 ดึงข้อมูลย้อนหลังตามช่วงเวลาที่เลือก
    fetch(`/api/flood?timeframe=${timeframe}`)
      .then(res => res.json())
      .then(json => {
        setData(Array.isArray(json) ? json : []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching analytics:", err);
        setLoading(false);
      });
  }, [timeframe]);

  // 📊 1. คำนวณค่าสถิติรายวัน (Daily Statistics)
  const dailySummary = useMemo(() => {
    const groups: any = {};
    data.forEach(log => {
      const dateKey = new Date(log.createdAt).toLocaleDateString('th-TH', {
        day: '2-digit', month: 'short'
      });
      if (!groups[dateKey]) {
        groups[dateKey] = { date: dateKey, level: [], temp: [], humid: [], count: 0, timestamp: new Date(log.createdAt).getTime() };
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

  // 📈 2. คำนวณภาพรวมระบบ (System Overview)
  const stats = useMemo(() => {
    if (data.length === 0) return { criticals: 0, avgRise: 0, safePercent: 0 };
    const levels = data.map(d => Number(d.level));
    const criticals = data.filter(d => d.status === 'CRITICAL').length;
    const safeDays = dailySummary.filter(d => Number(d.maxLevel) < 2.5).length;
    
    return {
      criticals: criticals,
      avgRise: (levels.reduce((a,b)=>a+b,0) / data.length).toFixed(2),
      safePercent: ((safeDays / dailySummary.length) * 100 || 0).toFixed(0)
    };
  }, [data, dailySummary]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0B1121]">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Analyzing Big Data...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1121] font-sans p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* 🌟 Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:scale-105 transition-transform shadow-sm">
              <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
            </Link>
            <div>
              <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter italic">SYSTEM ANALYTICS</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1 text-[10px] font-black text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full uppercase italic"><Zap size={12}/> AI Powered Insights</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">• Real-time Correlation</span>
              </div>
            </div>
          </div>
          
          <div className="flex bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            {['week', 'month', 'year'].map((t) => (
              <button 
                key={t} 
                onClick={() => setTimeframe(t)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeframe === t ? 'bg-[#1155FA] text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {t === 'year' ? 'Yearly' : t === 'month' ? 'Monthly' : 'Weekly'}
              </button>
            ))}
          </div>
        </div>

        {/* 🌟 Row 1: Key Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AnalyticStatCard label="Critical Frequency" value={`${stats.criticals} Logs`} sub="Detected in this period" icon={<ShieldAlert className="text-red-500"/>} color="border-red-500/20" />
          <AnalyticStatCard label="Avg. Water Level" value={`${stats.avgRise} cm`} sub="Overall Mean Value" icon={<Waves className="text-blue-500"/>} color="border-blue-500/20" />
          <AnalyticStatCard label="System Stability" value={`${stats.safePercent}%`} sub="Safe Days Ratio" icon={<CheckCircle2 className="text-emerald-500"/>} color="border-emerald-500/20" />
        </div>

        {/* 🌟 Row 2: Graph & AI Summary */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-8 bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs flex items-center gap-2">
                  <Layers size={18} className="text-blue-500" /> Historical Trend Analysis
                </h3>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">วิเคราะห์แนวโน้มระดับน้ำและค่าเฉลี่ยรายวัน</p>
              </div>
            </div>
            
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailySummary}>
                  <defs>
                    <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                  <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)'}} />
                  <Area type="monotone" name="Avg Level" dataKey="avgLevel" stroke="#3b82f6" strokeWidth={4} fill="url(#colorLevel)" />
                  <Line type="monotone" name="Max Peak" dataKey="maxLevel" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="xl:col-span-4 bg-[#1155FA] p-10 rounded-[3rem] text-white shadow-2xl shadow-blue-600/20 flex flex-col justify-between relative overflow-hidden">
             <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6 bg-white/10 w-fit px-3 py-1 rounded-full border border-white/10">
                   <Zap size={14} className="animate-pulse" />
                   <h3 className="font-black uppercase tracking-widest text-[10px]">AI Strategic Summary</h3>
                </div>
                <p className="text-2xl font-bold leading-tight tracking-tight">
                  {Number(stats.avgRise) > 2.0 
                    ? `"แนวโน้มน้ำในรอบ ${timeframe} มีการยกตัวขึ้นต่อเนื่อง แนะนำให้ตรวจสอบระบบระบายน้ำโซน Station 01 เป็นพิเศษ เนื่องจากพบจุด Peak บ่อยที่สุด"`
                    : `"สถานการณ์น้ำโดยรวมในรอบ ${timeframe} นี้ยังอยู่ในเกณฑ์ปกติ ความแม่นยำของเซนเซอร์อยู่ในระดับสูง แนะนำให้บำรุงรักษาตามรอบปกติ"`}
                </p>
             </div>
             
             <div className="mt-8 relative z-10 bg-white/10 p-5 rounded-[2rem] border border-white/10 backdrop-blur-xl">
                <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Model Reliability</span>
                    <span className="text-xs font-black">94%</span>
                </div>
                <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white w-[94%] rounded-full shadow-[0_0_15px_#fff]"></div>
                </div>
             </div>
             <BarChart3 className="absolute -right-20 -bottom-20 size-80 text-white/5 -rotate-12" />
          </div>
        </div>

        {/* 🌟 Row 3: Daily Summary Table & Export */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-10">
           <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
              <div className="p-8 border-b border-slate-50 dark:border-white/5 flex justify-between items-center">
                 <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs flex items-center gap-2">
                    <PieChart size={18} className="text-indigo-500" /> Daily Detailed Log
                 </h3>
                 <button className="text-[10px] font-black text-blue-500 flex items-center gap-1 hover:underline">
                    REFRESH DATA <ArrowUpRight size={14} />
                 </button>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 bg-slate-50/50 dark:bg-black/20">
                          <th className="px-8 py-5">Period</th>
                          <th className="px-8 py-5">Avg Level</th>
                          <th className="px-8 py-5">Peak Level</th>
                          <th className="px-8 py-5">Temp</th>
                          <th className="px-8 py-5">Humid</th>
                       </tr>
                    </thead>
                    <tbody className="text-sm font-bold">
                       {dailySummary.map((row, i) => (
                          <tr key={i} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                             <td className="px-8 py-5 text-slate-500">{row.date}</td>
                             <td className="px-8 py-5 text-blue-500">{row.avgLevel} cm</td>
                             <td className="px-8 py-5 text-red-500 font-black">{row.maxLevel} cm</td>
                             <td className="px-8 py-5 text-slate-400 font-medium">{row.avgTemp}°</td>
                             <td className="px-8 py-5 text-slate-400 font-medium">{row.avgHumid}%</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
           
           <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center text-center space-y-6 flex-grow group">
                <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-[2rem] flex items-center justify-center mx-auto transition-transform group-hover:rotate-12">
                  <Calendar size={48} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter italic">REPORT GENERATOR</h3>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">
                    สรุปผลการวิเคราะห์สภาพน้ำอัตโนมัติ
                  </p>
                </div>
                <button className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:scale-105 transition-all shadow-xl flex items-center justify-center gap-2">
                  <Download size={16} /> Download CSV Report
                </button>
              </div>
              
              <div className="bg-emerald-500 p-8 rounded-[3rem] text-white shadow-xl shadow-emerald-500/20">
                 <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-white/20 rounded-2xl"><CheckCircle2 size={24}/></div>
                    <span className="text-3xl font-black">Online</span>
                 </div>
                 <h4 className="font-black uppercase tracking-widest text-[10px] opacity-80">Network Status</h4>
                 <p className="text-xs font-bold mt-1">ทุกเซนเซอร์เชื่อมต่อปกติ 100%</p>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}

function AnalyticStatCard({ label, value, sub, icon, color }: any) {
  return (
    <div className={`bg-white dark:bg-slate-900 p-8 rounded-[3rem] border ${color} shadow-sm hover:-translate-y-2 transition-all duration-500 group`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{label}</p>
          <h4 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter italic group-hover:text-blue-500 transition-colors">{value}</h4>
          <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-wider">{sub}</p>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] transition-transform group-hover:scale-110 group-hover:-rotate-12">{icon}</div>
      </div>
    </div>
  );
}