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

  // 🎨 1. สีแยกตามประเภทข้อมูล (น้ำ=ฟ้า, อุณหภูมิ=ส้ม, ความชื้น=เขียว)
  const typeColors: any = {
    level: { stroke: "#3b82f6", fill: "#3b82f6" }, 
    temp: { stroke: "#f97316", fill: "#f97316" },  
    humid: { stroke: "#10b981", fill: "#10b981" }  
  };

  // 🎨 2. สีแยกตามเครื่อง (กรณีดู ALL)
  const deviceStyles: any = {
    'Station 01': { stroke: "#10b981" }, // เครื่อง 1 = เขียว
    'Station 02': { stroke: "#3b82f6" }, // เครื่อง 2 = ฟ้า
    'default': { stroke: "#8b5cf6" }
  };

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const timeMap = new Map();
    
    // ⚡ ปรับการสุ่มข้อมูลให้เหมาะสม
    const samplingRate = timeframe === 'year' ? Math.ceil(data.length / 200) : 1;

    data.forEach((log, index) => {
      if (index % samplingRate !== 0) return;
      const date = new Date(log.createdAt || log.timestamp);
      let timeKey = "";
      
      // 🛠️ แก้ไขการสร้าง Key เพื่อให้กราฟ "กระจายตัว" ไม่กองเป็นจุดเดียว
      if (timeframe === 'day') {
        timeKey = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      } else if (timeframe === 'week') {
        // รายสัปดาห์: แยกตาม วัน + ชั่วโมง
        timeKey = date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }) + " " + date.getHours() + ":00";
      } else if (timeframe === 'month') {
        // รายเดือน: แยกตาม วันที่
        timeKey = date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
      } else if (timeframe === 'year') {
        // รายปี: แยกตาม เดือน
        timeKey = date.toLocaleDateString('th-TH', { month: 'long' });
      }

      const deviceMac = log.mac || log.device_id;
      const device = devices.find(d => d.mac === deviceMac);
      const deviceName = device?.name || 'Unknown';

      if (!timeMap.has(timeKey)) timeMap.set(timeKey, { time: timeKey, timestamp: date.getTime() });
      const entry = timeMap.get(timeKey);
      
      const val = {
        level: Number(log.level || 0),
        temp: Number(log.temperature || 0),
        humid: Number(log.air_humidity || log.humidity || 0)
      };

      if (selectedDeviceMac === 'ALL') {
        entry[`${deviceName}_level`] = val.level;
        entry[`${deviceName}_temp`] = val.temp;
        entry[`${deviceName}_humid`] = val.humid;
      } else {
        entry.level = val.level;
        entry.temp = val.temp;
        entry.humid = val.humid;
      }
    });

    return Array.from(timeMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [data, devices, timeframe, selectedDeviceMac]);

  const maxValue = useMemo(() => {
    let max = 10;
    chartData.forEach(d => {
      Object.keys(d).forEach(k => {
        if (k.includes(activeTab) && d[k] > max) max = d[k];
      });
    });
    return Math.ceil(max * 1.2);
  }, [chartData, activeTab]);

  return (
    <div className="h-full flex flex-col w-full">
      {/* 🔘 ปุ่มเลือกโหมด (สีตามประเภท) */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: 'level', label: 'ระดับน้ำ', icon: <Waves size={14}/>, color: 'bg-blue-500' },
          { id: 'temp', label: 'อุณหภูมิ', icon: <Thermometer size={14}/>, color: 'bg-orange-500' },
          { id: 'humid', label: 'ความชื้น', icon: <Droplets size={14}/>, color: 'bg-emerald-500' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${
              activeTab === tab.id ? `${tab.color} text-white shadow-lg` : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}
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
              devices.map((d) => (
                <Area 
                  key={d.mac} 
                  type="monotone" 
                  name={d.name} 
                  dataKey={`${d.name}_${activeTab}`} 
                  stroke={deviceStyles[d.name]?.stroke || "#8b5cf6"} 
                  fillOpacity={0} 
                  strokeWidth={2.5} 
                  connectNulls 
                />
              ))
            ) : (
              <Area 
                type="monotone" 
                name={activeTab === 'level' ? 'ระดับน้ำ' : activeTab === 'temp' ? 'อุณหภูมิ' : 'ความชื้น'}
                dataKey={activeTab} 
                stroke={typeColors[activeTab].stroke} 
                fill="url(#colorFill)" 
                strokeWidth={3} 
                connectNulls 
              />
            )}
            <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}