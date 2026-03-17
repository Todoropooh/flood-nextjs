'use client';

import { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function WaterLevelChart({ 
  data = [], 
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
  
  // ✨ 1. เกราะป้องกัน Hydration Error (สำคัญมาก!)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const labels: string[] = [];
  const now = new Date();

  // ป้องกัน Array ว่างหรือ Error
  const safeDevices = Array.isArray(devices) ? devices : [];
  const safeData = Array.isArray(data) ? data : [];

  // คัดกรองอุปกรณ์
  const activeDevices = selectedDeviceMac === 'ALL' 
    ? (safeDevices.length > 0 ? safeDevices : [{ mac: 'ALL', name: 'โหนดจำลอง' }])
    : safeDevices.filter(d => d?.mac === selectedDeviceMac);

  const isOverview = activeDevices.length > 1 || selectedDeviceMac === 'ALL';

  useEffect(() => {
    if (isOverview && viewMode === 'ALL') setViewMode('LEVEL'); 
  }, [isOverview, viewMode]);

  // ✨ 2. ป้องกันแอปแครชจากช่วงเวลา (ถ้ายังไม่ Mount ให้โชว์ Loading รอไปก่อน ห้ามวาดกราฟเด็ดขาด)
  if (!mounted) {
    return (
      <div className="flex flex-col h-full w-full">
        <div className="flex-1 w-full relative min-h-[400px] flex items-center justify-center bg-slate-100/50 dark:bg-slate-800/30 rounded-2xl animate-pulse">
          <span className="text-slate-400 font-medium text-sm">กำลังโหลดกราฟ...</span>
        </div>
      </div>
    );
  }

  // ✨ 3. ป้องกัน TypeError ถ้าข้อมูล Date เป็น null
  const getItemDate = (item: any) => {
    if (!item) return new Date();
    const d = new Date(item.timestamp || item.createdAt || item.date);
    return isNaN(d.getTime()) ? new Date() : d; // ถ้าค่าเวลาพัง ให้ใช้วันนี้แทน
  };

  // เตรียมถังข้อมูล
  const deviceData: Record<string, { levels: any[], temps: any[], humidities: any[] }> = {};
  activeDevices.forEach(d => {
    if (d?.mac) deviceData[d.mac] = { levels: [], temps: [], humidities: [] };
  });

  const processBucket = (formattedLabel: string, matchedData: any[]) => {
    labels.push(formattedLabel);
    activeDevices.forEach(d => {
      if (!d?.mac) return;

      let deviceLogs = matchedData.filter(log => String(log?.mac || log?.device_id || '').trim().toLowerCase() === String(d.mac).trim().toLowerCase());
      
      if (deviceLogs.length === 0 && matchedData.length > 0) {
        deviceLogs = [matchedData[matchedData.length - 1]];
      }
      
      if (deviceLogs.length > 0) {
        const last = deviceLogs[deviceLogs.length - 1]; 
        
        // ✨ ใช้ ?? ป้องกัน null
        const valLevel = last?.water_level ?? last?.level ?? 0;
        deviceData[d.mac].levels.push(Number(valLevel) || 0);

        const valTemp = last?.temperature ?? last?.temp ?? 0;
        deviceData[d.mac].temps.push(Number(valTemp) || 0);

        const safeHumid = last?.air_humidity ?? last?.humidity ?? 0;
        deviceData[d.mac].humidities.push(Number(safeHumid) || 0);
      } else {
        deviceData[d.mac].levels.push(null);
        deviceData[d.mac].temps.push(null);
        deviceData[d.mac].humidities.push(null);
      }
    });
  };

  // Loop เวลา
  if (timeframe === 'year') {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const matched = safeData.filter(item => {
        const itDate = getItemDate(item);
        return itDate.getMonth() === d.getMonth() && itDate.getFullYear() === d.getFullYear();
      });
      processBucket(d.toLocaleString('th-TH', { month: 'short' }), matched);
    }
  } else if (timeframe === 'month') {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const matched = safeData.filter(item => getItemDate(item).toDateString() === d.toDateString());
      processBucket(d.getDate().toString(), matched);
    }
  } else {
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 60 * 60 * 1000); 
      const matched = safeData.filter(item => {
        const itDate = getItemDate(item);
        return itDate.getHours() === d.getHours() && itDate.toDateString() === d.toDateString();
      });
      processBucket(d.getHours() + ':00', matched);
    }
  }

  // Datasets
  const datasets: any[] = [];
  const colors = [
    { b: '#3b82f6', g: 'rgba(59, 130, 246, 0.1)' }, 
    { b: '#10b981', g: 'rgba(16, 185, 129, 0.1)' }, 
    { b: '#f59e0b', g: 'rgba(245, 158, 11, 0.1)' }
  ];

  activeDevices.forEach((d, index) => {
    if (!d?.mac) return;
    const c = colors[index % colors.length];
    const dat = deviceData[d.mac];
    
    if (viewMode === 'ALL' || viewMode === 'LEVEL') {
      datasets.push({ 
        label: isOverview ? `${d.name || d.mac} (ระดับน้ำ)` : 'ระดับน้ำ (cm)', 
        data: dat.levels, 
        borderColor: isOverview ? c.b : '#3b82f6', 
        backgroundColor: c.g, 
        borderWidth: 4, 
        pointRadius: 4, 
        tension: 0.3, 
        fill: !isOverview, 
        spanGaps: true, 
        yAxisID: 'y' 
      });
    }

    if (viewMode === 'ALL' || viewMode === 'TEMP') {
      datasets.push({ 
        label: isOverview ? `${d.name || d.mac} (อุณหภูมิ)` : 'อุณหภูมิ (°C)', 
        data: dat.temps, 
        borderColor: '#f97316', 
        borderWidth: 2, 
        pointRadius: 3, 
        tension: 0.3, 
        spanGaps: true, 
        yAxisID: 'y1' 
      });
    }

    if (viewMode === 'ALL' || viewMode === 'HUMIDITY') {
      datasets.push({ 
        label: isOverview ? `${d.name || d.mac} (ความชื้น)` : 'ความชื้น (%)', 
        data: dat.humidities, 
        borderColor: '#06b6d4', 
        borderWidth: 2, 
        pointRadius: 3, 
        tension: 0.3, 
        spanGaps: true, 
        yAxisID: 'y2' 
      });
    }
  });

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, labels: { color: isDark ? '#cbd5e1' : '#475569', font: { weight: 'bold', size: 12 } } },
      tooltip: { mode: 'index' as const, intersect: false }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#64748b' } },
      y: { type: 'linear' as const, display: viewMode === 'LEVEL' || viewMode === 'ALL', position: 'left' as const, beginAtZero: true, max: 100, ticks: { color: '#3b82f6' } },
      y1: { type: 'linear' as const, display: viewMode === 'TEMP' || viewMode === 'ALL', position: 'right' as const, max: 60, grid: { drawOnChartArea: false }, ticks: { color: '#f97316' } },
      y2: { type: 'linear' as const, display: viewMode === 'HUMIDITY' || viewMode === 'ALL', position: 'right' as const, max: 100, grid: { drawOnChartArea: false }, ticks: { color: '#06b6d4' } }
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex flex-wrap justify-center gap-2 mb-6 relative z-20">
        {!isOverview && <button onClick={() => setViewMode('ALL')} className={`px-4 py-1.5 text-[11px] font-bold rounded-full transition-all ${viewMode === 'ALL' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>ALL</button>}
        <button onClick={() => setViewMode('LEVEL')} className={`px-4 py-1.5 text-[11px] font-bold rounded-full transition-all ${viewMode === 'LEVEL' ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-50 text-blue-600'}`}>ระดับน้ำ</button>
        <button onClick={() => setViewMode('TEMP')} className={`px-4 py-1.5 text-[11px] font-bold rounded-full transition-all ${viewMode === 'TEMP' ? 'bg-orange-600 text-white shadow-md' : 'bg-orange-50 text-orange-600'}`}>อุณหภูมิ</button>
        <button onClick={() => setViewMode('HUMIDITY')} className={`px-4 py-1.5 text-[11px] font-black rounded-full transition-all ${viewMode === 'HUMIDITY' ? 'bg-cyan-600 text-white shadow-md' : 'bg-cyan-50 text-cyan-600'}`}>ความชื้น</button>
      </div>
      <div className="flex-1 w-full relative min-h-[400px]">
        {/* @ts-ignore chartjs */}
        <Line data={{ labels, datasets }} options={options} />
      </div>
    </div>
  );
}