'use client';

import React, { useMemo, useState } from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Waves, Thermometer, Droplets } from 'lucide-react';

interface WaterLevelChartProps {
  data: any[];
  isDark: boolean;
  devices: any[];
  timeframe: string;
  selectedDeviceMac: string;
}

export default function WaterLevelChart({ data, isDark, devices, timeframe, selectedDeviceMac }: WaterLevelChartProps) {
  const [activeTab, setActiveTab] = useState<'level' | 'temp' | 'humid'>('level');

  const typeColors: any = {
    level: { stroke: "#3b82f6", fill: "#3b82f6" }, 
    temp: { stroke: "#f97316", fill: "#f97316" },  
    humid: { stroke: "#10b981", fill: "#10b981" }  
  };

  const chartData = useMemo(() => {
    const timelineMap = new Map();
    const now = new Date();

    // 🌟 1. สร้างแกนเวลาเปล่าถอยหลัง (ใช้ปี/เดือน/วัน เป็น Key เพื่อกันเรื่อง Timezone)
    const iterations = timeframe === 'year' ? 12 : timeframe === 'month' ? 30 : timeframe === 'week' ? 7 : 0;
    
    for (let i = iterations; i >= 0; i--) {
      const d = new Date();
      if (timeframe === 'year') d.setMonth(now.getMonth() - i);
      else d.setDate(now.getDate() - i);

      // สร้าง Key ที่เป็นมาตรฐาน (ISO Date) เพื่อเอาไว้แมพข้อมูล
      const dateKey = timeframe === 'year' 
        ? d.toLocaleDateString('th-TH', { month: 'long' })
        : d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });

      timelineMap.set(dateKey, { 
        time: dateKey, 
        timestamp: d.setHours(0,0,0,0), // ตั้งเป็นต้นวันเพื่อการ Sort
        level: 0, temp: 0, humid: 0 
      });
    }

    // 🌟 2. นำข้อมูลจริงมาหยอด
    if (data && data.length > 0) {
      data.forEach(log => {
        const date = new Date(log.createdAt || log.timestamp);
        let key = "";
        
        if (timeframe === 'day') {
          key = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        } else if (timeframe === 'year') {
          key = date.toLocaleDateString('th-TH', { month: 'long' });
        } else {
          key = date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
        }

        const val = {
          level: Number(log.level || 0),
          temp: Number(log.temperature || 0),
          humid: Number(log.air_humidity || log.humidity || 0)
        };

        if (timeframe === 'day') {
          // รายวัน: ถ้าไม่มี Key นี้ให้สร้างใหม่ (เพราะ Day เราไม่ได้จอง Timeline ไว้ล่วงหน้า)
          if (!timelineMap.has(key)) {
            timelineMap.set(key, { time: key, timestamp: date.getTime(), ...val });
          } else {
            const entry = timelineMap.get(key);
            entry.level = val.level; entry.temp = val.temp; entry.humid = val.humid;
          }
        } else if (timelineMap.has(key)) {
          // รายอื่น: หยอดลงช่องที่จองไว้
          const entry = timelineMap.get(key);
          if (selectedDeviceMac === 'ALL') {
            const device = devices.find(d => d.mac === log.mac);
            const name = device?.name || 'Unknown';
            entry[`${name}_${activeTab}`] = val[activeTab];
          } else {
            entry.level = val.level; entry.temp = val.temp; entry.humid = val.humid;
          }
        }
      });
    }

    const result = Array.from(timelineMap.values()).sort((a: any, b: any) => a.timestamp - b.timestamp);
    console.log("Chart Data Debug:", result); // ดูใน Console ได้ว่าข้อมูลมาไหม
    return result;
  }, [data, timeframe, devices, selectedDeviceMac, activeTab]);

  const maxValue = useMemo(() => {
    let max = 5; // ตั้งพื้นฐานไว้ 5
    chartData.forEach((d: any) => {
      Object.keys(d).forEach(k => {
        if (k.includes(activeTab) || k === 'level' || k === 'temp' || k === 'humid') {
          if (typeof d[k] === 'number' && d[k] > max) max = d[k];
        }
      });
    });
    return Math.ceil(max * 1.2);
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
            <YAxis domain={[0, maxValue]} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
            <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', background: isDark ? '#1e293b' : '#fff', fontSize: '12px' }} />
            
            {selectedDeviceMac === 'ALL' ? (
              devices.map((d, i) => (
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