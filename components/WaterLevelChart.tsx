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

  // 🎨 กำหนดสีประจำหมวดข้อมูล
  const themeColors = {
    level: { stroke: "#3b82f6", fill: "#3b82f6", predict: "#f97316" }, // น้ำ = น้ำเงิน, คาดการณ์ = ส้ม
    temp: { stroke: "#f97316", fill: "#f97316" }, // อุณหภูมิ = ส้ม
    humid: { stroke: "#10b981", fill: "#10b981" } // ความชื้น = เขียว
  };

  const calculateWaterLevel = (rawLevel: number, installHeight: number) => {
    if (isNaN(rawLevel) || rawLevel <= 0) return 0;
    let actualLevel = installHeight - rawLevel;
    if (actualLevel < 0) return 0;
    if (actualLevel > installHeight) return installHeight;
    return Number(actualLevel.toFixed(2));
  };

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // ⚡ Performance Optimization: Sampling ข้อมูลถ้าเยอะเกิน 500 จุด
    const samplingRate = data.length > 500 ? Math.ceil(data.length / 500) : 1;
    const timeMap = new Map();

    data.filter((_, index) => index % samplingRate === 0).forEach(log => {
      const date = new Date(log.createdAt || log.timestamp);
      // Format เวลาตามความเหมาะสมของช่วงเวลา
      let timeKey = "";
      if (timeframe === 'day') timeKey = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      else if (timeframe === 'year') timeKey = date.toLocaleDateString('th-TH', { month: 'short' });
      else timeKey = date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });

      const deviceMac = log.mac || log.device_id;
      const device = devices.find(d => d.mac === deviceMac);
      const h = device?.installHeight ?? 13.5;

      const waterLevel = calculateWaterLevel(Number(log.level), h);
      const temp = Number(log.temperature || 0);
      const humid = Number(log.humidity || log.air_humidity || 0);
      const deviceName = device?.name || deviceMac || 'Unknown';

      if (selectedDeviceMac === 'ALL') {
        if (!timeMap.has(timeKey)) timeMap.set(timeKey, { time: timeKey, timestamp: date.getTime() });
        const entry = timeMap.get(timeKey);
        entry[`${deviceName}_level`] = waterLevel;
        entry[`${deviceName}_temp`] = temp;
        entry[`${deviceName}_humid`] = humid;
      } else {
        if (!timeMap.has(timeKey)) {
          timeMap.set(timeKey, { time: timeKey, timestamp: date.getTime(), level: waterLevel, temp: temp, humid: humid, count: 1 });
        } else {
          const existing = timeMap.get(timeKey);
          existing.level = ((existing.level * existing.count) + waterLevel) / (existing.count + 1);
          existing.temp = ((existing.temp * existing.count) + temp) / (existing.count + 1);
          existing.humid = ((existing.humid * existing.count) + humid) / (existing.count + 1);
          existing.count += 1;
        }
      }
    });

    let processed = Array.from(timeMap.values()).sort((a, b) => a.timestamp - b.timestamp);

    // 🚀 เพิ่ม AI PREDICTION (เฉพาะถ้าน้ำขึ้นเร็ว)
    if (activeTab === 'level' && selectedDeviceMac !== 'ALL' && processed.length > 1) {
      const latest = processed[processed.length - 1];
      const thirtyMinsAgo = latest.timestamp - (30 * 60 * 1000);
      let past = processed.find(d => d.timestamp >= thirtyMinsAgo) || processed[0];
      const dtHours = (latest.timestamp - past.timestamp) / 3600000;
      const rate = dtHours > 0 ? (latest.level - past.level) / dtHours : 0;

      latest.predicted_level = latest.level;
      const hMax = devices.find(d => d.mac === selectedDeviceMac)?.installHeight ?? 13.5;

      for (let i = 1; i <= 3; i++) {
        let pLevel = latest.level + (rate * i);
        processed.push({
          time: `+${i}h`,
          timestamp: latest.timestamp + (i * 3600000),
          predicted_level: Number(Math.min(Math.max(0, pLevel), hMax).toFixed(2))
        } as any);
      }
    }
    return processed;
  }, [data, devices, timeframe, selectedDeviceMac, activeTab]);

  // 🌟 ป้องกันกราฟล้น: หาค่าสูงสุดของข้อมูลปัจจุบัน
  const maxValue = useMemo(() => {
    if (chartData.length === 0) return 20;
    let max = 0;
    chartData.forEach(d => {
      const val = d[activeTab] || d.predicted_level || 0;
      if (val > max) max = val;
      // กรณีดูรวมทุกเครื่อง
      if (selectedDeviceMac === 'ALL') {
        Object.keys(d).forEach(k => { if (k.endsWith(`_${activeTab}`) && d[k] > max) max = d[k]; });
      }
    });
    return Math.ceil(max * 1.25); // เผื่อขอบบน 25%
  }, [chartData, activeTab, selectedDeviceMac]);

  return (
    <div className="h-full flex flex-col w-full">
      {/* 🌟 Tab Selector แยกสีชัดเจน */}
      <div className="flex gap-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4 overflow-x-auto scrollbar-hide">
        {[
          { id: 'level', label: 'Water Level', icon: <Waves size={16}/>, color: 'bg-blue-500' },
          { id: 'temp', label: 'Temperature', icon: <Thermometer size={16}/>, color: 'bg-orange-500' },
          { id: 'humid', label: 'Humidity', icon: <Droplets size={16}/>, color: 'bg-emerald-500' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab.id ? `${tab.color} text-white shadow-lg` : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-grow w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={themeColors[activeTab].stroke} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={themeColors[activeTab].stroke} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1e293b' : '#e2e8f0'} />
            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} minTickGap={40} />
            <YAxis domain={[0, maxValue]} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} allowDataOverflow={true} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', background: isDark ? '#1e293b' : '#fff' }} />
            
            {selectedDeviceMac === 'ALL' ? (
              devices.map((d, i) => (
                <Area key={d.mac} type="monotone" name={d.name} dataKey={`${d.name}_${activeTab}`} stroke={["#3b82f6", "#10b981", "#f59e0b", "#ec4899"][i % 4]} fillOpacity={0} strokeWidth={2.5} connectNulls />
              ))
            ) : (
              <>
                <Area 
                  type="monotone" 
                  dataKey={activeTab} 
                  stroke={themeColors[activeTab].stroke} 
                  strokeWidth={3} 
                  fill="url(#colorFill)" 
                  isAnimationActive={false} // ⚡ ปิดเพื่อความลื่น
                  connectNulls 
                />
                {activeTab === 'level' && (
                  <Line type="monotone" dataKey="predicted_level" stroke={themeColors.level.predict} strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
                )}
              </>
            )}
            {selectedDeviceMac === 'ALL' && <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}