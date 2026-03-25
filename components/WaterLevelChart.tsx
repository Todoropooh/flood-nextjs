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
    const processedMap = new Map();
    const now = new Date();
    
    // 🌟 1. สร้างแกนเวลาเปล่าตามช่วงเวลา (เพื่อให้กราฟย้อนไปเต็มแม้ไม่มีข้อมูล)
    if (timeframe === 'month') {
      for (let i = 30; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const key = d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
        processedMap.set(key, { time: key, timestamp: d.getTime(), level: 0, temp: 0, humid: 0 });
      }
    } else if (timeframe === 'year') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(now.getMonth() - i);
        const key = d.toLocaleDateString('th-TH', { month: 'long' });
        processedMap.set(key, { time: key, timestamp: d.getTime(), level: 0, temp: 0, humid: 0 });
      }
    } else if (timeframe === 'week') {
      for (let i = 7; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const key = d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
        processedMap.set(key, { time: key, timestamp: d.getTime(), level: 0, temp: 0, humid: 0 });
      }
    }

    // 🌟 2. นำข้อมูลจริงมา Mapping ลงในแกนเวลา
    if (data && Array.isArray(data)) {
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

        const deviceMac = log.mac || log.device_id;
        const device = devices.find(d => d.mac === deviceMac);
        const deviceName = device?.name || 'Unknown';

        const val = {
          level: Number(log.level || 0),
          temp: Number(log.temperature || 0),
          humid: Number(log.air_humidity || log.humidity || 0)
        };

        // สำหรับรายวัน (Day) ให้เพิ่มจุดใหม่ตลอดเพราะต้องการความละเอียดสูง
        if (timeframe === 'day') {
          if (!processedMap.has(key)) {
            processedMap.set(key, { time: key, timestamp: date.getTime(), level: val.level, temp: val.temp, humid: val.humid });
          }
        } else {
          // สำหรับช่วงอื่นๆ ให้หยอดลงใน Slot ที่เตรียมไว้
          if (processedMap.has(key)) {
            const entry = processedMap.get(key);
            if (selectedDeviceMac === 'ALL') {
              entry[`${deviceName}_${activeTab}`] = val[activeTab];
            } else {
              entry.level = val.level;
              entry.temp = val.temp;
              entry.humid = val.humid;
            }
          }
        }
      });
    }

    return Array.from(processedMap.values()).sort((a: any, b: any) => a.timestamp - b.timestamp);
  }, [data, timeframe, devices, selectedDeviceMac, activeTab]);

  const maxValue = useMemo(() => {
    let max = 10;
    chartData.forEach((d: any) => {
      Object.keys(d).forEach(k => {
        if (k.includes(activeTab) && d[k] > max) max = d[k];
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
          <button
            key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${activeTab === tab.id ? `${tab.color} text-white shadow-lg` : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-grow w-full">
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
              <Area type="monotone" name={activeTab} dataKey={activeTab} stroke={typeColors[activeTab].stroke} fill="url(#colorFill)" strokeWidth={3} dot={false} connectNulls />
            )}
            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}