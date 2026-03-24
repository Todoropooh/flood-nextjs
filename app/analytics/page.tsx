'use client';

import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend, AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, ArrowLeft, activity, Calendar, 
  Layers, BarChart3, PieChart, Filter, Zap
} from 'lucide-react';
import Link from 'next/link';

// Mockup ข้อมูลสำหรับการเปรียบเทียบสถานี
const comparisonData = [
  { time: '00:00', stationA: 120, stationB: 80, stationC: 40 },
  { time: '04:00', stationA: 150, stationB: 95, stationC: 45 },
  { time: '08:00', stationA: 210, stationB: 140, stationC: 60 },
  { time: '12:00', stationA: 190, stationB: 180, stationC: 110 },
  { time: '16:00', stationA: 170, stationB: 160, stationC: 150 },
  { time: '20:00', stationA: 160, stationB: 140, stationC: 130 },
];

export default function AnalyticsPage() {
  const [isDark] = useState(false); // เชื่อมกับ Theme ของพี่ได้เลย

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1121] font-sans p-6 transition-colors duration-300">
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        {/* 🌟 Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:scale-105 transition-transform shadow-sm">
              <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
            </Link>
            <div>
              <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight italic">System Analytics</h1>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Zap size={14} className="text-blue-500" /> Advanced Insights & Correlations
              </p>
            </div>
          </div>
          
          <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            {['Monthly', 'Quarterly', 'Yearly'].map((t) => (
              <button key={t} className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${t === 'Monthly' ? 'bg-[#1155FA] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* 🌟 Row 1: Key Performance Metrics (UX: สรุปตัวเลขที่ผ่านการวิเคราะห์มาแล้ว) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AnalyticStatCard label="Critical Frequency" value="12 Times" sub="In this month" icon={<ShieldAlert className="text-red-500"/>} />
          <AnalyticStatCard label="Avg. Rising Rate" value="4.2 cm/h" sub="Max at Station 01" icon={<TrendingUp className="text-blue-500"/>} />
          <AnalyticStatCard label="Safe Days" value="18 Days" sub="75% of total period" icon={<CheckCircle2 className="text-emerald-500"/>} />
        </div>

        {/* 🌟 Row 2: Station Correlation (UX: ดูการเดินทางของน้ำ) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-8 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-sm flex items-center gap-2">
                  <Layers size={18} className="text-blue-500" /> Multi-Station Correlation
                </h3>
                <p className="text-xs font-medium text-slate-400 mt-1">เปรียบเทียบการขึ้นลงของน้ำระหว่างสถานีต้นน้ำและปลายน้ำ</p>
              </div>
            </div>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} />
                  <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
                  <Legend iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '12px', fontWeight: 'bold'}} />
                  <Line type="monotone" dataKey="stationA" name="Station 01 (Upstream)" stroke="#3b82f6" strokeWidth={4} dot={{r: 6}} activeDot={{r: 8}} />
                  <Line type="monotone" dataKey="stationB" name="Station 02 (Midstream)" stroke="#10b981" strokeWidth={4} dot={{r: 6}} />
                  <Line type="monotone" dataKey="stationC" name="Station 03 (Downstream)" stroke="#f59e0b" strokeWidth={4} dot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="xl:col-span-4 bg-[#1155FA] p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-500/20 flex flex-col justify-between relative overflow-hidden">
             <div className="relative z-10">
                <h3 className="font-black uppercase tracking-widest text-xs opacity-70 mb-2">AI Summary</h3>
                <p className="text-xl font-bold leading-relaxed">
                  "จากการวิเคราะห์ 30 วันที่ผ่านมา พบว่าเมื่อสถานีต้นน้ำสูงขึ้นเกิน 150cm สถานีปลายน้ำจะได้รับผลกระทบภายใน 4 ชั่วโมง แนะนำให้เตรียมแผนระบายน้ำล่วงหน้า"
                </p>
             </div>
             <div className="mt-8 relative z-10 bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                <div className="flex justify-between items-center mb-2">
                   <span className="text-[10px] font-black uppercase tracking-widest">Prediction Accuracy</span>
                   <span className="text-xs font-black">92%</span>
                </div>
                <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                   <div className="h-full bg-white w-[92%] rounded-full shadow-[0_0_10px_#fff]"></div>
                </div>
             </div>
             <BarChart3 className="absolute -right-10 -bottom-10 size-64 text-white/5 -rotate-12" />
          </div>
        </div>

        {/* 🌟 Row 3: Water Distribution (UX: ดูภาพรวมในรูปแบบอื่น) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
                <PieChart size={18} className="text-indigo-500" /> Alert Level Distribution
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="time" hide />
                    <Tooltip cursor={{fill: 'transparent'}} />
                    <Bar dataKey="stationA" fill="#3b82f6" radius={[10, 10, 10, 10]} barSize={20} />
                    <Bar dataKey="stationB" fill="#10b981" radius={[10, 10, 10, 10]} barSize={20} />
                    <Bar dataKey="stationC" fill="#f59e0b" radius={[10, 10, 10, 10]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
           </div>
           
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center text-center space-y-4">
              <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <Calendar size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Generate Monthly Report</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto">
                สร้างรายงานสรุปผลการวิเคราะห์สภาพน้ำรายเดือนแบบอัตโนมัติ พร้อมส่งเข้าอีเมล Admin
              </p>
              <button className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-transform active:scale-95 shadow-xl">
                Download PDF Report
              </button>
           </div>
        </div>

      </div>
    </div>
  );
}

function AnalyticStatCard({ label, value, sub, icon }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:-translate-y-1 transition-transform">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
          <h4 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">{value}</h4>
          <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">{sub}</p>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">{icon}</div>
      </div>
    </div>
  );
}