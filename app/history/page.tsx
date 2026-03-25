'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { Calendar, Filter, Download, Search, Database, ArrowLeft, Loader2, Thermometer, Droplets, Signal, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function HistoryPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // --- States ---
  const [logs, setLogs] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter States
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDevice, setSelectedDevice] = useState('ALL');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const devRes = await fetch('/api/settings', { cache: 'no-store' });
      if (devRes.ok) {
        const devData = await devRes.json();
        setDevices(Array.isArray(devData) ? devData : [devData]);
      }

      const logRes = await fetch(`/api/flood?timeframe=month&t=${Date.now()}`, { cache: 'no-store' });
      if (logRes.ok) {
        const logData = await logRes.json();
        setLogs(Array.isArray(logData) ? logData : []);
      }
    } catch (error) {
      console.error("Error fetching history data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Filtering Logic ---
  const filteredLogs = useMemo(() => {
    let result = [...logs];

    if (selectedDevice !== 'ALL') {
      result = result.filter(log => (log.mac === selectedDevice || log.device_id === selectedDevice));
    }

    if (selectedDate) {
      result = result.filter(log => {
        const logDate = new Date(log.createdAt || log.timestamp).toISOString().split('T')[0];
        return logDate === selectedDate;
      });
    }

    return result.sort((a, b) => new Date(b.createdAt || b.timestamp).getTime() - new Date(a.createdAt || a.timestamp).getTime());
  }, [logs, selectedDevice, selectedDate]);

  // --- Pagination Logic ---
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const currentLogs = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredLogs, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDevice, selectedDate]);

  // --- Helper Functions ---
  const getDeviceName = (mac: string) => {
    const dev = devices.find(d => d.mac === mac);
    return dev ? dev.name : mac;
  };

  // 🌟 [UI อัปเกรด] ปรับสี Badge ให้เข้ากับธีมโปร่งแสง
  const getStatusBadge = (status: string) => {
    const s = (status || 'STABLE').toUpperCase();
    if (s === 'CRITICAL' || s === 'DANGER') {
      return (
        <span className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1 bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
          <ShieldAlert size={12} /> Critical
        </span>
      );
    }
    if (s === 'WARNING') {
      return (
        <span className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1 bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30">
          <AlertTriangle size={12} /> Warning
        </span>
      );
    }
    return (
      <span className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
        <CheckCircle2 size={12} /> Stable
      </span>
    );
  };

  const exportToCSV = () => {
    if (filteredLogs.length === 0) return alert("No data to export");
    const headers = ["Timestamp", "Device Name", "MAC Address", "Water Level (cm)", "Temperature (C)", "Humidity (%)", "Signal (CSQ)", "Status"];
    const rows = filteredLogs.map(l => [
      new Date(l.createdAt || l.timestamp).toLocaleString(),
      getDeviceName(l.mac || l.device_id),
      l.mac || l.device_id,
      Number(l.level || 0).toFixed(2),
      Number(l.temperature || 0).toFixed(1),
      Number(l.air_humidity || l.humidity || 0).toFixed(1),
      l.signal || 0,
      l.status || 'STABLE'
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Flood_Report_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen font-sans pb-24 md:pb-10 relative overflow-hidden transition-colors duration-300">
      
      {/* 🌟 [UI อัปเกรด] ธีมพื้นหลังรูปภาพ + กระจกเบลอ เหมือนหน้า Dashboard */}
      <div className="fixed inset-0 -z-10 bg-[#0f172a]">
        <img src="https://images.pexels.com/photos/1295138/pexels-photo-1295138.jpeg" className="w-full h-full object-cover opacity-100" alt="background" />
        <div className="absolute inset-0 bg-slate-100/50 dark:bg-black/70 backdrop-blur-[40px] transition-colors duration-500" />
      </div>

      <div className="max-w-[1600px] mx-auto p-4 sm:p-6 space-y-6 relative z-10">
        
        {/* Header & Back Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-3 bg-white/40 dark:bg-black/40 border border-white/50 dark:border-white/10 backdrop-blur-md rounded-2xl hover:scale-105 transition-transform shadow-sm">
              <ArrowLeft size={20} className="text-slate-800 dark:text-white" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white tracking-tight drop-shadow-sm">Data Archive</h1>
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest drop-shadow-sm">History & Reports</p>
            </div>
          </div>
          <button 
            onClick={exportToCSV}
            disabled={filteredLogs.length === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3.5 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-500/30 hover:bg-blue-500 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>

        {/* 🌟 [UI อัปเกรด] Filter Bar สไตล์ Glassmorphism */}
        <div className={`grid grid-cols-1 md:grid-cols-12 gap-5 p-6 sm:p-8 rounded-[2.5rem] shadow-2xl backdrop-blur-xl transition-all ${isDark ? 'bg-[#1C1C1E]/60 border border-white/10' : 'bg-white/60 border border-white/50'}`}>
          <div className="md:col-span-4 space-y-2">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest ml-2 drop-shadow-sm">Select Date</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" size={18} />
              <input 
                type="date" 
                className="w-full pl-12 pr-4 py-4 bg-white/40 dark:bg-black/40 border border-white/50 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer backdrop-blur-md"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
          
          <div className="md:col-span-5 space-y-2">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest ml-2 drop-shadow-sm">Device Source</label>
            <div className="relative">
              <Database className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" size={18} />
              <select 
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white/40 dark:bg-black/40 border border-white/50 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer backdrop-blur-md"
              >
                <option value="ALL" className="text-black">ALL STATIONS OVERVIEW</option>
                {devices.map(dev => (
                  <option key={dev.mac} value={dev.mac} className="text-black">
                    {dev.name} ({dev.mac})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="md:col-span-3 flex items-end">
            <div className="w-full py-4 px-5 bg-white/40 dark:bg-black/40 border border-white/50 dark:border-white/10 rounded-2xl flex items-center justify-between backdrop-blur-md shadow-inner">
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest drop-shadow-sm">Records Found</span>
              <span className="text-xl font-black text-blue-600 dark:text-blue-400 drop-shadow-sm">{filteredLogs.length}</span>
            </div>
          </div>
        </div>

        {/* 🌟 [UI อัปเกรด] Table Content สไตล์ Glassmorphism */}
        <div className={`rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col min-h-[500px] backdrop-blur-xl transition-all ${isDark ? 'bg-[#1C1C1E]/60 border border-white/10' : 'bg-white/60 border border-white/50'}`}>
          <div className="overflow-x-auto flex-grow p-2">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-white/30 dark:border-white/10 bg-white/20 dark:bg-black/20 backdrop-blur-md">
                  <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 dark:text-slate-300 tracking-widest drop-shadow-sm rounded-tl-2xl">Timestamp</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 dark:text-slate-300 tracking-widest drop-shadow-sm">Station</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 dark:text-slate-300 tracking-widest drop-shadow-sm text-center">Water Level</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 dark:text-slate-300 tracking-widest drop-shadow-sm text-center">Environment</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 dark:text-slate-300 tracking-widest drop-shadow-sm text-center">Signal</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-500 dark:text-slate-300 tracking-widest drop-shadow-sm text-right rounded-tr-2xl">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/30 dark:divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-32 text-center">
                      <Loader2 className="animate-spin text-blue-500 mx-auto mb-4" size={40} />
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest drop-shadow-sm">Loading Data...</p>
                    </td>
                  </tr>
                ) : currentLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-32 text-center">
                      <div className="w-20 h-20 bg-white/40 dark:bg-black/40 border border-white/50 dark:border-white/10 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <Search className="text-slate-500 dark:text-slate-300" size={32} />
                      </div>
                      <p className="text-base font-black text-slate-700 dark:text-white drop-shadow-sm">No records found</p>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-2 drop-shadow-sm">Try selecting a different date or station</p>
                    </td>
                  </tr>
                ) : (
                  currentLogs.map((log, i) => (
                    <tr key={i} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-5">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {new Date(log.createdAt || log.timestamp).toLocaleDateString('en-GB')}
                        </p>
                        <p className="text-[10px] font-mono font-black text-slate-500 dark:text-slate-400 mt-0.5">
                          {new Date(log.createdAt || log.timestamp).toLocaleTimeString('en-GB')}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wide">
                          {getDeviceName(log.mac || log.device_id)}
                        </p>
                        <p className="text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400 mt-0.5">{log.mac || log.device_id}</p>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="text-lg font-black text-blue-600 dark:text-blue-400 tabular-nums drop-shadow-sm">
                          {Number(log.level || 0).toFixed(2)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1">cm</span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex items-center justify-center gap-4">
                          <div className="flex items-center gap-1.5 text-[11px] font-black text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-1 rounded-lg border border-orange-500/20" title="Temperature">
                            <Thermometer size={14} /> {Number(log.temperature || 0).toFixed(1)}°
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] font-black text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-lg border border-cyan-500/20" title="Humidity">
                            <Droplets size={14} /> {Number(log.air_humidity || log.humidity || 0).toFixed(1)}%
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-[11px] font-black text-slate-600 dark:text-slate-300">
                          <Signal size={14} className={log.signal > 10 ? "text-emerald-500" : "text-red-500"} />
                          {log.signal || 0}
                        </div>
                      </td>
                      <td className="px-6 py-5 flex justify-end">
                        {getStatusBadge(log.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 🌟 [UI อัปเกรด] Pagination สไตล์ Glassmorphism */}
          {!isLoading && totalPages > 1 && (
            <div className="p-6 border-t border-white/30 dark:border-white/10 bg-white/20 dark:bg-black/20 backdrop-blur-md flex flex-wrap justify-center gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 bg-white/40 dark:bg-black/40 border border-white/50 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all backdrop-blur-md shadow-sm"
              >
                Prev
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                let pageNum = currentPage <= 3 ? idx + 1 : currentPage - 2 + idx;
                if (pageNum > totalPages) return null;

                return (
                  <button 
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-w-[40px] h-10 rounded-xl text-xs font-black transition-all backdrop-blur-md ${
                      currentPage === pageNum 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 border border-blue-500' 
                        : 'bg-white/40 dark:bg-black/40 text-slate-600 dark:text-slate-300 border border-white/50 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10 shadow-sm'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 bg-white/40 dark:bg-black/40 border border-white/50 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all backdrop-blur-md shadow-sm"
              >
                Next
              </button>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}