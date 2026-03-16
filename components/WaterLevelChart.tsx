'use client';

import { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function WaterLevelChart({ 
  data, 
  isDark, 
  timeframe = 'day',
  devices = [], 
  selectedDeviceMac = 'ALL' 
}: { 
  data: any[], 
  isDark: boolean, 
  timeframe?: string,
  devices?: any[],
  selectedDeviceMac?: string
}) {
  const [viewMode, setViewMode] = useState<'ALL' | 'LEVEL' | 'TEMP' | 'HUMIDITY'>('ALL');
  const labels: string[] = [];
  const now = new Date();

  // 1. คัดกรองอุปกรณ์
  const activeDevices = selectedDeviceMac === 'ALL' 
    ? (devices.length > 0 ? devices : [])
    : devices.filter(d => d.mac === selectedDeviceMac);

  const isOverview = activeDevices.length > 1 || selectedDeviceMac === 'ALL';

  useEffect(() => {
    // บังคับให้หน้ารวมเริ่มต้นที่โหมด LEVEL เสมอ (จะได้ไม่รก)
    if (isOverview && viewMode === 'ALL') setViewMode('LEVEL'); 
  }, [isOverview, viewMode]);

  // 2. เตรียมถังข้อมูล
  const deviceData: Record<string, { levels: any[], temps: any[], humidities: any[] }> = {};
  activeDevices.forEach(d => {
    deviceData[d.mac] = { levels: [], temps: [], humidities: [] };
  });

  const processBucket = (formattedLabel: string, matchedData: any[]) => {
    labels.push(formattedLabel);
    activeDevices.forEach(d => {
      const deviceLogs = matchedData.filter(log => String(log.mac).trim() === String(d.mac).trim());
      
      if (deviceLogs.length > 0) {
        const last = deviceLogs[deviceLogs.length - 1]; 
        
        deviceData[d.mac].levels.push(Number(last.level) || 0);
        deviceData[d.mac].temps.push(Number(last.temperature) || 0);

        const safeHumid = last.air_humidity !== undefined ? last.air_humidity : last.humidity;
        deviceData[d.mac].humidities.push(Number(safeHumid) || 0);
      } else {
        deviceData[d.mac].levels.push(null);
        deviceData[d.mac].temps.push(null);
        deviceData[d.mac].humidities.push(null);
      }
    });
  };

  // 3. Loop เวลาตาม Timeframe
  if (timeframe === 'year') {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const matched = data.filter(item => {
        const itemDate = new Date(item.createdAt);
        return itemDate.getFullYear() === d.getFullYear() && itemDate.getMonth() === d.getMonth();
      });
      processBucket(d.toLocaleString('th-TH', { month: 'short' }), matched);
    }
  } else if (timeframe === 'month') {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const matched = data.filter(item => new Date(item.createdAt).toDateString() === d.toDateString());
      processBucket(d.getDate().toString(), matched);
    }
  } else if (timeframe === 'week') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const matched = data.filter(item => new Date(item.createdAt).toDateString() === d.toDateString());
      processBucket(d.toLocaleString('th-TH', { weekday: 'short' }), matched);
    }
  } else {
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 5 * 60 * 1000); 
      const matched = data.filter(item => {
        const itemDate = new Date(item.createdAt);
        return itemDate.getFullYear() === d.getFullYear() && 
               itemDate.getMonth() === d.getMonth() && 
               itemDate.getDate() === d.getDate() && 
               itemDate.getHours() === d.getHours() &&
               Math.floor(itemDate.getMinutes() / 5) === Math.floor(d.getMinutes() / 5); 
      });
      processBucket(d.toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.', matched);
    }
  }

  // 4. Datasets (ปลดล็อกให้แสดงได้ทุกโหมดแล้ว)
  const datasets: any[] = [];
  const colors = [
    { b: '#3b82f6', g: 'rgba(59, 130, 246, 0.1)' }, 
    { b: '#10b981', g: 'rgba(16, 185, 129, 0.1)' }, 
    { b: '#f59e0b', g: 'rgba(245, 158, 11, 0.1)' }
  ];

  activeDevices.forEach((d, index) => {
    const c = colors[index % colors.length];
    const dat = deviceData[d.mac];
    
    // กราฟระดับน้ำ
    if (viewMode === 'ALL' || viewMode === 'LEVEL') {
      datasets.push({ 
        label: isOverview ? `${d.name} (ระดับน้ำ)` : 'ระดับน้ำ (cm)', 
        data: dat.levels, 
        borderColor: isOverview ? c.b : '#3b82f6', 
        backgroundColor: c.g, 
        borderWidth: 3, 
        pointRadius: 3, 
        tension: 0.4, 
        fill: !isOverview, 
        spanGaps: true, 
        yAxisID: 'y' 
      });
    }

    // กราฟอุณหภูมิ (เอาเงื่อนไข !isOverview ออกแล้ว)
    if (viewMode === 'ALL' || viewMode === 'TEMP') {
      datasets.push({ 
        label: isOverview ? `${d.name} (อุณหภูมิ)` : 'อุณหภูมิ (°C)', 
        data: dat.temps, 
        borderColor: isOverview ? c.b : '#f97316', // ถ้ารวมใช้สีของโหนด ถ้าเดี่ยวใช้สีส้ม
        borderWidth: 2, 
        pointRadius: 3, 
        tension: 0.4, 
        spanGaps: true, 
        yAxisID: 'y1' 
      });
    }

    // กราฟความชื้น (เอาเงื่อนไข !isOverview ออกแล้ว)
    if (viewMode === 'ALL' || viewMode === 'HUMIDITY') {
      datasets.push({ 
        label: isOverview ? `${d.name} (ความชื้น)` : 'ความชื้น (%)', 
        data: dat.humidities, 
        borderColor: isOverview ? c.b : '#06b6d4', // ถ้ารวมใช้สีของโหนด ถ้าเดี่ยวใช้สีฟ้า
        borderWidth: 2, 
        pointRadius: 3, 
        tension: 0.4, 
        spanGaps: true, 
        yAxisID: 'y2' 
      });
    }
  });

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, labels: { color: isDark ? '#cbd5e1' : '#475569', font: { weight: 'bold' } } },
      tooltip: { mode: 'index' as const, intersect: false }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#64748b' } },
      // 🟢 ปรับให้ซ่อนแกนซ้ายขวาตามปุ่มที่กด เพื่อไม่ให้รก
      y: { type: 'linear' as const, display: viewMode === 'LEVEL' || viewMode === 'ALL', position: 'left' as const, beginAtZero: true, max: 20, ticks: { color: '#3b82f6' } },
      y1: { type: 'linear' as const, display: viewMode === 'TEMP' || viewMode === 'ALL', position: 'right' as const, max: 50, grid: { drawOnChartArea: false }, ticks: { color: '#f97316' } },
      y2: { type: 'linear' as const, display: viewMode === 'HUMIDITY' || viewMode === 'ALL', position: 'right' as const, max: 100, grid: { drawOnChartArea: false }, ticks: { color: '#06b6d4' } }
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex flex-wrap justify-center gap-2 mb-4 relative z-20">
        {!isOverview && <button onClick={() => setViewMode('ALL')} className={`px-4 py-1.5 text-[10px] font-black rounded-full transition-all ${viewMode === 'ALL' ? 'bg-slate-700 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>ALL</button>}
        <button onClick={() => setViewMode('LEVEL')} className={`px-4 py-1.5 text-[10px] font-black rounded-full transition-all flex items-center gap-1 ${viewMode === 'LEVEL' ? 'bg-blue-500 text-white shadow-md' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}><span className="w-2 h-2 rounded-full bg-blue-400"></span> LEVEL</button>
        <button onClick={() => setViewMode('TEMP')} className={`px-4 py-1.5 text-[10px] font-black rounded-full transition-all flex items-center gap-1 ${viewMode === 'TEMP' ? 'bg-orange-500 text-white shadow-md' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'}`}><span className="w-2 h-2 rounded-full bg-orange-400"></span> TEMP</button>
        <button onClick={() => setViewMode('HUMIDITY')} className={`px-4 py-1.5 text-[10px] font-black rounded-full transition-all flex items-center gap-1 ${viewMode === 'HUMIDITY' ? 'bg-cyan-500 text-white shadow-md' : 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100'}`}><span className="w-2 h-2 rounded-full bg-cyan-400"></span> HUMIDITY</button>
      </div>
      <div className="flex-1 w-full relative min-h-[250px]">
        {/* @ts-expect-error chartjs */}
        <Line data={{ labels, datasets }} options={options} />
      </div>
    </div>
  );
}