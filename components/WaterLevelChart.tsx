'use client';

import React, { useMemo, useState } from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Waves, Thermometer, Droplets } from 'lucide-react';

export default function WaterLevelChart({ data, isDark, devices, timeframe, selectedDeviceMac }: any) {
  const [activeTab, setActiveTab] = useState<'level' | 'temp' | 'humid'>('level');

  const typeColors: any = {
    level: { stroke: "#3b82f6", fill: "#3b82f6" }, 
    temp: { stroke: "#f97316", fill: "#f97316" },  
    humid: { stroke: "#10b981", fill: "#10b981" }  
  };

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // 🚀 Optimize: ลดจุดข้อมูลลงเหลือไม่เกิน 400 จุดเพื่อให้กราฟไม่ยุ่ยและหน้าเว็บไหลลื่น
    const maxPoints = 400; 
    const step = Math.max(1, Math.floor(data.length / maxPoints));
    const processed = [];
    
    for (let i = 0; i < data.length; i += step) {
      const chunk = data.slice(i, i + step);
      const avg = (key: string) => chunk.reduce((sum: number, d: any) => sum + Number(d[key] || 0), 0) / chunk.length;
      
      const item = data[i];
      const d = new Date(item.createdAt || item.timestamp);
      let label = "";
      if (timeframe === 'day') label = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      else if (timeframe === 'year') label = d.toLocaleDateString('th-TH', { month: 'short' });
      else label = d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });

      const entry: any = {
        time: label,
        timestamp: d.getTime(),
        level: avg('level') > 150 ? 0 : avg('level'),
        temp: avg('temperature'),
        humid: avg('air_humidity') || avg('humidity'),
      };

      if (selectedDeviceMac === 'ALL') {
        const device = devices.find((dev: any) => dev.mac === item.mac);
        entry[`${device?.name || 'Unknown'}_${activeTab}`] = entry[activeTab];
      }
      processed.push(entry);
    }

    // เติมจุดเริ่มต้นให้กราฟย้อนไปสุด Timeline (Zero Padding)
    if (processed.length > 0) {
      const now = new Date();
      let start = new Date();
      if (timeframe === 'week') start.setDate(now.getDate() - 7);
      else if (timeframe === 'month') start.setMonth(now.getMonth() - 1);
      else if (timeframe === 'year') start.setFullYear(now.getFullYear() - 1);

      if (new Date(processed[0].timestamp) > start) {
        processed.unshift({
          time: timeframe === 'year' ? start.toLocaleDateString('th-TH', { month: 'short' }) : start.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }),
          timestamp: start.getTime(),
          level: 0, temp: 0, humid: 0
        });
      }
    }

    return processed.sort((a, b) => a.timestamp - b.timestamp);
  }, [data, timeframe, devices, selectedDeviceMac, activeTab]);

  const maxValue = useMemo(() => {
    let max = 5;
    chartData.forEach((d: any) => {
      Object.keys(d).forEach(k => {
        if (typeof d[k] === 'number' && d[k] > max && d[k] < 150) max = d[k];
      });
    });
    return Math.ceil(max * 1.3);
  }, [chartData, activeTab]);

  return (
    <div className="h-full flex flex-col w-full">
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: 'level', label: 'ระดับน้ำ', icon: <Waves size={14}/>, color: 'bg-blue-500' },
          { id: 'temp', label: 'อุณหภูมิ', icon: <Thermometer size={14}/>, color: 'bg-orange-500' },
          { id: 'humid', label: 'ความชื้น', icon: <Droplets size={14}/>, color: 'bg-emerald-500' }
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === tab.id ? `${tab.color} text-white shadow-lg` : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-grow w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={typeColors[activeTab].stroke} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={typeColors[activeTab].stroke} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e2e8f0'} />
            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9}} minTickGap={40} />
            <YAxis domain={[0, maxValue]} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
            <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', background: isDark ? '#1e293b' : '#fff', fontSize: '12px' }} />
            
            {selectedDeviceMac === 'ALL' ? (
              devices.map((d: any, i: number) => (
                <Area key={d.mac} type="monotone" name={d.name} dataKey={`${d.name}_${activeTab}`} stroke={["#3b82f6", "#10b981", "#f59e0b"][i % 3]} fillOpacity={0} strokeWidth={2.5} connectNulls isAnimationActive={false} />
              ))
            ) : (
              <Area type="monotone" name={activeTab} dataKey={activeTab} stroke={typeColors[activeTab].stroke} fill="url(#colorFill)" strokeWidth={3} connectNulls isAnimationActive={false} />
            )}
            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}