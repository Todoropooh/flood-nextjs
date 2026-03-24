'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Filter, Download, Search, Database, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function HistoryPage() {
  // สร้าง State สำหรับ Filter ข้อมูล
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDevice, setSelectedDevice] = useState('ALL');

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1121] font-sans p-6 transition-colors duration-300">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* Header & Back Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:scale-105 transition-transform shadow-sm">
              <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Data Archive</h1>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">History & Reports</p>
            </div>
          </div>
          <button className="flex items-center gap-2 bg-[#1155FA] text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-[#0A3DCD] transition-all active:scale-95">
            <Download size={16} /> Export All Data
          </button>
        </div>

        {/* Filter Bar (UX: กรองได้ทันที) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input 
                type="date" 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Device Source</label>
            <select className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none">
              <option>All Stations</option>
              <option>Station 01 (Surin)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2">
              <Search size={16} /> Apply Filters
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Timestamp</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Device Name</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Water Level (cm)</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {/* Mockup Data */}
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">2024-03-20 14:05:{i}0</td>
                    <td className="px-6 py-4 text-sm font-black text-slate-800 dark:text-white">Station 01</td>
                    <td className="px-6 py-4 text-sm font-black text-blue-600 dark:text-blue-400">145.20</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 uppercase">Stable</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-[10px] font-black uppercase text-slate-400 hover:text-blue-500 transition-colors">Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination Placeholder */}
          <div className="p-4 border-t border-slate-50 dark:border-slate-800 flex justify-center gap-2">
            {[1, 2, 3].map(p => (
              <button key={p} className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${p === 1 ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>{p}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}