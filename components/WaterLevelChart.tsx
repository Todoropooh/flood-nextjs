'use client';

import React, { useMemo, useState } from 'react';
import { ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Waves, Thermometer, Droplets } from 'lucide-react';

export default function WaterLevelChart({ data, isDark, devices, timeframe, selectedDeviceMac }: any) {
  const [activeTab, setActiveTab] = useState<'level' | 'temp' | 'humid'>('level');

  const typeColors: any = {
    level: { stroke: "#3b82f6", fill: "#3b82f6" }, 
    temp: { stroke: "#f97316", fill: "#f97316" },  
    humid: { stroke: "#10b981", fill: "#10b981" }  
  };

  // 🎨 สีสำหรับเส้นกราฟแต่ละสถานีเวลาดูโหมด ALL
  const stationColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const maxPoints = 300; 
    const step = Math.max(1, Math.floor(data.length / maxPoints));
    
    // 🌟 [FIXED] จัดกลุ่มข้อมูลตาม "เวลา" เพื่อให้ 1 จุดมีค่าของทุกสถานี (สำหรับโหมด ALL)
    const timeMap = new Map();

    for (let i = 0; i < data.length; i += step) {
      const item = data[i];
      const d = new Date(item.createdAt || item.timestamp);
      
      let label = "";
      if (timeframe === 'day') label = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      else if (timeframe === 'year') label = d.toLocaleDateString('en-GB', { month: 'short' });
      else label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

      // ใช้ Timestamp คร่าวๆ (ปัดเศษหลักนาที) เป็น Key ในการรวมกลุ่ม
      const timeKey = Math.floor(d.getTime() / 60000) * 60000;

      if (!timeMap.has(timeKey)) {
        timeMap.set(timeKey, { 
          time: label, 
          timestamp: timeKey,
          level: 0, temp: 0, humid: 0, count: 0 
        });
      }

      const entry = timeMap.get(timeKey);
      const valLevel = Number(item.level || 0) > 150 ? 0 : Number(item.level || 0);
      const valTemp = Number(item.temperature || 0);
      const valHumid = Number(item.air_humidity || item.humidity || 0);

      // โหมดดูทีละสถานี (ค่าเฉลี่ยปกติ)
      entry.level += valLevel;
      entry.temp += valTemp;
      entry.humid += valHumid;
      entry.count++;

      // 🌟 โหมด ALL Stations: เก็บค่าแยกตามชื่อสถานี
      const device = (devices || []).find((dev: any) => dev.mac === (item.mac || item.device_id));
      const devName = device?.name || (item.mac || item.device_id);
      
      entry[`${devName}_level`] = valLevel;
      entry[`${devName}_temp`] = valTemp;
      entry[`${devName}_humid`] = valHumid;
    }

    // ประมวลผลหาค่าเฉลี่ย
    let processed = Array.from(timeMap.values()).map(entry => {
      entry.level = entry.level / entry.count;
      entry.temp = entry.temp / entry.count;
      entry.humid = entry.humid / entry.count;
      return entry;
    });

    // เรียงตามเวลา
    return processed.sort((a, b) => a.timestamp - b.timestamp);
  }, [data, timeframe, devices, activeTab]);

  // หาค่า Max เพื่อให้กราฟไม่ชนขอบบน
  const maxValue = useMemo(() => {
    let max = 5;
    chartData.forEach((d: any) => {
      Object.keys(d).forEach(k => {
        if (k.includes(activeTab) && typeof d[k] === 'number' && d[k] > max && d[k] < 150) max = d[k];
      });
    });
    return Math.ceil(max * 1.2);
  }, [chartData, activeTab]);

  return (
    <div className="h-full flex flex-col w-full">
      {/* 🌟 [UI อัปเกรด] ปุ่มสลับ Tab แบบ Glassmorphism */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: 'level', label: 'ระดับน้ำ', icon: <Waves size={14}/>, color: 'bg-blue-500', border: 'border-blue-500' },
          { id: 'temp', label: 'อุณหภูมิ', icon: <Thermometer size={14}/>, color: 'bg-orange-500', border: 'border-orange-500' },
          { id: 'humid', label: 'ความชื้น', icon: <Droplets size={14}/>, color: 'bg-emerald-500', border: 'border-emerald-500' }
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all backdrop-blur-md border ${
              activeTab === tab.id 
                ? `${tab.color} text-white ${tab.border} shadow-lg shadow-${tab.color.split('-')[1]}-500/30` 
                : 'bg-white/20 dark:bg-black/20 text-slate-600 dark:text-slate-300 border-white/30 dark:border-white/10 hover:bg-white/40 dark:hover:bg-white/10'
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* 🌟 กราฟแสดงผล */}
      <div className="flex-grow w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={typeColors[activeTab].stroke} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={typeColors[activeTab].stroke} stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#ffffff' : '#0f172a'} opacity={0.1} />
            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: isDark ? '#cbd5e1' : '#64748b', fontSize: 9, fontWeight: 'bold'}} minTickGap={40} dy={10} />
            <YAxis domain={[0, maxValue]} axisLine={false} tickLine={false} tick={{fill: isDark ? '#cbd5e1' : '#64748b', fontSize: 10, fontWeight: 'bold'}} dx={-10} />
            
            {/* 🌟 [UI อัปเกรด] Tooltip โปร่งแสง */}
            <Tooltip 
              contentStyle={{ 
                borderRadius: '16px', 
                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)', 
                background: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(10px)',
                fontSize: '12px',
                fontWeight: 'bold',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
              }} 
              itemStyle={{ color: isDark ? '#fff' : '#333' }}
              labelStyle={{ color: '#888', textTransform: 'uppercase', fontSize: '10px', marginBottom: '4px' }}
            />
            
            {/* 🌟 Logic วาดกราฟ */}
            {selectedDeviceMac === 'ALL' ? (
              // โหมด ALL: วนลูปสร้าง Area แยกตามแต่ละสถานี
              (devices || []).map((d: any, i: number) => {
                const dataKey = `${d.name}_${activeTab}`;
                const color = stationColors[i % stationColors.length];
                // เช็คว่ามีข้อมูลของเส้นนี้จริงๆ ใน chartData ไหม
                const hasData = chartData.some(item => item[dataKey] !== undefined);
                if (!hasData) return null;

                return (
                  <Area 
                    key={d.mac} 
                    type="monotone" 
                    name={d.name} 
                    dataKey={dataKey} 
                    stroke={color} 
                    fillOpacity={0} 
                    strokeWidth={3} 
                    connectNulls 
                    isAnimationActive={false} 
                  />
                );
              })
            ) : (
              // โหมดสถานีเดียว: วาด Area ปกติ
              <Area 
                type="monotone" 
                name={activeTab.toUpperCase()} 
                dataKey={activeTab} 
                stroke={typeColors[activeTab].stroke} 
                fill="url(#colorFill)" 
                strokeWidth={4} 
                connectNulls 
                isAnimationActive={false} 
              />
            )}
            
            <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', paddingTop: '10px' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}