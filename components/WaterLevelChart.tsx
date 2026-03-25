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
    const timelineMap = new Map();
    const now = new Date();

    const getMapKey = (d: Date) => {
      if (timeframe === 'day') return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      if (timeframe === 'year') return d.toLocaleDateString('en-US', { month: 'short' });
      return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
    };

    // 1. จองแกนเวลา (ถอยหลังไปตามช่วงเวลา)
    const iterations = timeframe === 'year' ? 12 : timeframe === 'month' ? 30 : timeframe === 'week' ? 7 : 48; // รายวันจอง 48 จุด (ทุก 30 นาที)
    for (let i = iterations; i >= 0; i--) {
      const d = new Date(now);
      if (timeframe === 'year') d.setMonth(now.getMonth() - i);
      else if (timeframe === 'day') d.setMinutes(now.getMinutes() - (i * 30));
      else d.setDate(now.getDate() - i);
      const key = getMapKey(d);
      timelineMap.set(key, { time: key, timestamp: d.getTime(), level: 0, temp: 0, humid: 0 });
    }

    // 2. หยอดข้อมูลจริง
    if (data && data.length > 0) {
      data.forEach((log: any) => {
        const d = new Date(log.createdAt || log.timestamp);
        const key = getMapKey(d);
        
        // 🌟 กรองค่าที่ผิดปกติ (เช่น เซนเซอร์ดีดไป 300-400 ทั้งที่ถังสูงแค่ 30)
        let rawLevel = Number(log.level || 0);
        if (rawLevel > 150) rawLevel = 0; // ถ้าเกิน 150cm (เมตรครึ่ง) ให้ถือว่าค่าเพี้ยน

        const val = {
          level: rawLevel,
          temp: Number(log.temperature || 0),
          humid: Number(log.air_humidity || log.humidity || 0)
        };

        if (timelineMap.has(key)) {
          const entry = timelineMap.get(key);
          if (selectedDeviceMac === 'ALL') {
            const dev = devices.find((x: any) => x.mac === log.mac);
            const name = dev?.name || 'Unknown';
            entry[`${name}_${activeTab}`] = val[activeTab];
          } else {
            entry.level = val.level; entry.temp = val.temp; entry.humid = val.humid;
          }
        } else if (timeframe === 'day') {
          timelineMap.set(key, { time: key, timestamp: d.getTime(), ...val });
        }
      });
    }

    return Array.from(timelineMap.values()).sort((a: any, b: any) => a.timestamp - b.timestamp);
  }, [data, timeframe, devices, selectedDeviceMac, activeTab]);

  // 🌟 ปรับปรุงการหาค่า Max (ไม่ให้โดดตามค่า Error)
  const maxValue = useMemo(() => {
    let max = 0;
    chartData.forEach((d: any) => {
      Object.keys(d).forEach(k => {
        if (k.includes(activeTab) || ['level', 'temp', 'humid'].includes(k)) {
          const v = Number(d[k]);
          if (v > max && v < 150) max = v; // สนใจเฉพาะค่าที่ไม่เกิน 150
        }
      });
    });
    
    // ถ้าเป็นระดับน้ำ ให้ล็อคความสูงตามถัง (สมมติถังสูง 30cm) หรือตามค่าจริง
    if (activeTab === 'level') return max > 30 ? Math.ceil(max * 1.2) : 35; 
    return Math.ceil(max * 1.2) || 40;
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
            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9}} minTickGap={30} />
            {/* 🌟 บังคับ Domain ให้เริ่มที่ 0 เสมอ */}
            <YAxis domain={[0, maxValue]} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
            <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', background: isDark ? '#1e293b' : '#fff', fontSize: '12px' }} />
            
            {selectedDeviceMac === 'ALL' ? (
              devices.map((d: any, i: number) => (
                <Area key={d.mac} type="monotone" name={d.name} dataKey={`${d.name}_${activeTab}`} stroke={["#10b981", "#3b82f6", "#f59e0b"][i % 3]} fillOpacity={0} strokeWidth={2.5} connectNulls />
              ))
            ) : (
              <Area type="monotone" name={activeTab} dataKey={activeTab} stroke={typeColors[activeTab].stroke} fill="url(#colorFill)" strokeWidth={3} connectNulls />
            )}
            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}