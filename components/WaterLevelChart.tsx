'use client';

import React, { useMemo, useState } from 'react';
// 🌟 เปลี่ยนจาก AreaChart เป็น ComposedChart เพื่อให้วาดทั้ง Area (พื้นทึบ) และ Line (เส้นประ) ผสมกันได้
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

  // 🌟 ฟังก์ชันคำนวณระดับน้ำที่ถูกต้อง (Install Height - Raw Distance)
  const calculateWaterLevel = (rawLevel: number, installHeight: number) => {
    if (isNaN(rawLevel) || rawLevel <= 0) return 0;
    let actualLevel = installHeight - rawLevel;
    if (actualLevel < 0) return 0; 
    if (actualLevel > installHeight) return installHeight; 
    return Number(actualLevel.toFixed(2));
  };

  // 🌟 ฟังก์ชันจัด Format แกนเวลาให้ตรงกัน
  const formatTimeKey = (date: Date) => {
    if (timeframe === 'day') return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    if (timeframe === 'week' || timeframe === 'month') return date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
    if (timeframe === 'year') return date.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
    return date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
  };

  // 🌟 ประมวลผลข้อมูลกราฟ + สร้างเส้นประคาดการณ์ล่วงหน้า
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const timeMap = new Map();

    data.forEach(log => {
      const date = new Date(log.createdAt || log.timestamp);
      const timeKey = formatTimeKey(date);

      const deviceMac = log.mac || log.device_id;
      const device = devices.find(d => d.mac === deviceMac);
      const installHeight = device?.installHeight ?? 13.5; 

      const waterLevel = calculateWaterLevel(Number(log.level), installHeight);
      const temp = Number(log.temperature || 0);
      const humid = Number(log.humidity || log.air_humidity || 0);
      const deviceName = device?.name || deviceMac || 'Unknown';

      if (selectedDeviceMac === 'ALL') {
        if (!timeMap.has(timeKey)) timeMap.set(timeKey, { time: timeKey, timestamp: date.getTime() });
        const existingData = timeMap.get(timeKey);
        existingData[`${deviceName}_level`] = waterLevel;
        existingData[`${deviceName}_temp`] = temp;
        existingData[`${deviceName}_humid`] = humid;
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

    let finalData = Array.from(timeMap.values()).sort((a, b) => a.timestamp - b.timestamp);

    // Format ตัวเลขทศนิยมให้สวยงาม
    finalData = finalData.map(item => {
      if (selectedDeviceMac !== 'ALL') {
         item.level = Number(item.level.toFixed(2));
         item.temp = Number(item.temp.toFixed(1));
         item.humid = Number(item.humid.toFixed(1));
      }
      return item;
    });

    // 🚀 เพิ่ม AI PREDICTION (เส้นประคาดการณ์น้ำท่วมล่วงหน้า 3 ชั่วโมง)
    if (activeTab === 'level' && selectedDeviceMac !== 'ALL' && finalData.length > 1) {
       const latest = finalData[finalData.length - 1];
       
       // คำนวณหา Rate of Change จาก 30 นาทีที่ผ่านมา
       const thirtyMinsAgo = latest.timestamp - (30 * 60 * 1000);
       let past = finalData.find(d => d.timestamp >= thirtyMinsAgo) || finalData[0];

       const dtHours = (latest.timestamp - past.timestamp) / 3600000;
       const rate = dtHours > 0 ? (latest.level - past.level) / dtHours : 0;

       // เชื่อมจุดสุดท้ายของกราฟจริง ให้ติดกับกราฟเส้นประ
       latest.predicted_level = latest.level;

       const device = devices.find(d => d.mac === selectedDeviceMac);
       const maxH = device?.installHeight ?? 13.5;

       // สร้างจุดข้อมูลอนาคต (+1 ชม, +2 ชม, +3 ชม)
       for (let i = 1; i <= 3; i++) {
           const futureTs = latest.timestamp + (i * 3600000); 
           let pLevel = latest.level + (rate * i);
           
           // ไม่ให้น้ำต่ำกว่า 0 หรือล้นเกินเซ็นเซอร์
           if (pLevel < 0) pLevel = 0;
           if (pLevel > maxH) pLevel = maxH;

           finalData.push({
               time: `+${i}h (Pred)`, // ให้แกน X โชว์ชัดๆ ว่าเป็นอนาคต
               timestamp: futureTs,
               predicted_level: Number(pLevel.toFixed(2))
           });
       }
    }

    return finalData;
  }, [data, devices, timeframe, selectedDeviceMac, activeTab]);

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#ef4444"];

  // 🌟 ป้องกันกราฟล้นทะลุขอบ 
  const maxValue = useMemo(() => {
    if (chartData.length === 0) return 20; 
    let max = 0;
    chartData.forEach(d => {
       if (selectedDeviceMac === 'ALL') {
          Object.keys(d).forEach(k => {
             if (k.endsWith(`_${activeTab}`) && d[k] > max) max = d[k];
          });
       } else {
          if (d[activeTab] > max) max = d[activeTab];
          if (d.predicted_level > max) max = d.predicted_level; // เช็คค่าคาดการณ์ด้วย
       }
    });
    return Math.ceil(max * 1.2); 
  }, [chartData, activeTab, selectedDeviceMac]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-4 rounded-xl shadow-xl border ${isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-slate-100'} backdrop-blur-md`}>
          <p className={`font-bold text-sm mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{label}</p>
          {payload.map((entry: any, index: number) => {
             if (entry.value === undefined || entry.value === null) return null;
             
             let unit = 'cm';
             if (activeTab === 'temp') unit = '°C';
             if (activeTab === 'humid') unit = '%';

             // เปลี่ยนชื่อ Tooltip ถ้าเป็นเส้นคาดการณ์
             let name = entry.name.replace(`_${activeTab}`, '');
             if (entry.dataKey === 'predicted_level') name = 'คาดการณ์ล่วงหน้า';

             return (
              <div key={index} className="flex items-center gap-2 text-sm font-bold my-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>
                  {name}: 
                </span>
                <span style={{ color: entry.color }}>
                  {Number(entry.value).toFixed(2)} {unit}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full flex flex-col w-full">
      {/* 🌟 แท็บเปลี่ยนโหมด */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setActiveTab('level')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === 'level' 
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
              : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Waves size={16} /> Water Level
        </button>
        <button
          onClick={() => setActiveTab('temp')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === 'temp' 
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' 
              : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Thermometer size={16} /> Temperature
        </button>
        <button
          onClick={() => setActiveTab('humid')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
            activeTab === 'humid' 
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
              : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Droplets size={16} /> Humidity
        </button>
      </div>

      <div className="flex-grow w-full relative min-h-[300px]">
        {chartData.length === 0 ? (
           <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">No data available</p>
           </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {/* 🌟 ใช้ ComposedChart เพื่อผสม Area กับ Line */}
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                {devices.map((d, index) => (
                   <linearGradient key={`color-${d.mac}`} id={`color-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors[index % colors.length]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={colors[index % colors.length]} stopOpacity={0} />
                  </linearGradient>
                ))}
                <linearGradient id="colorSingle" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={activeTab === 'temp' ? '#f97316' : activeTab === 'humid' ? '#10b981' : '#3b82f6'} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={activeTab === 'temp' ? '#f97316' : activeTab === 'humid' ? '#10b981' : '#3b82f6'} stopOpacity={0} />
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1e293b' : '#e2e8f0'} />
              
              <XAxis 
                dataKey="time" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: isDark ? '#64748b' : '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
                dy={10}
                minTickGap={30}
              />
              
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: isDark ? '#64748b' : '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
                dx={-10}
                domain={[0, maxValue]} 
                allowDataOverflow={true} 
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              {selectedDeviceMac === 'ALL' && <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '10px' }} />}

              {selectedDeviceMac === 'ALL' ? (
                devices.map((device, index) => {
                  const dataKey = `${device.name}_${activeTab}`;
                  const hasData = chartData.some(d => d[dataKey] !== undefined);
                  if (!hasData) return null;
                  return (
                    <Area
                      key={device.mac}
                      type="monotone"
                      name={device.name} 
                      dataKey={dataKey}
                      stroke={colors[index % colors.length]}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill={`url(#color-${index})`}
                      connectNulls={true} 
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  );
                })
              ) : (
                <>
                  {/* เส้นประวัติศาสตร์ (ข้อมูลจริง) */}
                  <Area
                    type="monotone"
                    name={activeTab.toUpperCase()}
                    dataKey={activeTab}
                    stroke={activeTab === 'temp' ? '#f97316' : activeTab === 'humid' ? '#10b981' : '#3b82f6'}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorSingle)"
                    connectNulls={true}
                    activeDot={{ r: 6, strokeWidth: 0, fill: activeTab === 'temp' ? '#f97316' : activeTab === 'humid' ? '#10b981' : '#3b82f6' }}
                  />
                  
                  {/* 🚀 เส้นคาดการณ์อนาคต (เส้นประสีส้ม) */}
                  {activeTab === 'level' && (
                    <Line
                      type="monotone"
                      name="Prediction"
                      dataKey="predicted_level"
                      stroke="#f97316" // สีส้มเตือนภัย
                      strokeWidth={3}
                      strokeDasharray="5 5" // ทำให้เป็นเส้นประ
                      dot={{ r: 4, strokeWidth: 0, fill: '#f97316' }}
                      activeDot={{ r: 7, strokeWidth: 0 }}
                      connectNulls={true}
                    />
                  )}
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}