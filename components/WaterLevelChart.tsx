'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

export default function WaterLevelChart({
  data = [],
  isDark,
  timeframe = 'day',
  devices = [],
  selectedDeviceMac = 'ALL'
}: any) {
  const [viewMode, setViewMode] = useState<'LEVEL' | 'TEMP' | 'HUMIDITY' | 'ALL_METRICS'>('ALL_METRICS');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const chartData = useMemo(() => {
    if (!mounted) return { labels: [], datasets: [] };

    const labels: string[] = [];
    const now = new Date();
    let steps = timeframe === 'day' ? 24 : timeframe === 'week' ? 7 : 30;
    for (let i = steps - 1; i >= 0; i--) {
      const d = new Date(now);
      if (timeframe === 'day') {
        d.setHours(d.getHours() - i);
        labels.push(d.getHours() + ':00');
      } else {
        d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }));
      }
    }

    const datasets: any[] = [];
    const nodeColors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

    devices.forEach((dev: any, idx: number) => {
      if (selectedDeviceMac !== 'ALL' && dev.mac !== selectedDeviceMac) return;

      const deviceLogs = data.filter((l: any) => l.mac === dev.mac);
      const mainColor = nodeColors[idx % nodeColors.length];

      // 🌊 ระดับน้ำ (แก้ให้ตรงกับสูตรหน้าแรก 84.0 และหักลบ 5.0)
      if (viewMode === 'ALL_METRICS' || viewMode === 'LEVEL') {
        datasets.push({
          label: `🌊 ${dev.name} - น้ำ (cm)`,
          data: labels.map((_, index) => {
            if (deviceLogs.length === 0) return null;
            const log = deviceLogs[Math.floor((index / labels.length) * deviceLogs.length)];
            const raw = Number(log?.level || 84.0);
            
            // 🌟 ใช้สูตรเดียวกันเป๊ะกับหน้า page.tsx
            let val = (84.0 - raw) - 5.0; 
            
            if (raw <= 0.5 || raw > 90) val = 0;
            return val < 0 ? 0 : (val > 40 ? 40 : val); // ถัง 40 cm
          }),
          borderColor: mainColor,
          backgroundColor: mainColor + '15',
          yAxisID: 'y',
          tension: 0.4,
          spanGaps: true
        });
      }

      // 🌡️ อุณหภูมิ
      if (viewMode === 'ALL_METRICS' || viewMode === 'TEMP') {
        datasets.push({
          label: `🌡️ ${dev.name} - Temp (°C)`,
          data: labels.map((_, index) => {
            if (deviceLogs.length === 0) return null;
            const log = deviceLogs[Math.floor((index / labels.length) * deviceLogs.length)];
            return Number(log?.temperature) || null;
          }),
          borderColor: '#f97316',
          yAxisID: 'y1',
          borderDash: viewMode === 'ALL_METRICS' ? [5, 5] : [],
          tension: 0.4,
          spanGaps: true
        });
      }

      // 💧 ความชื้น
      if (viewMode === 'ALL_METRICS' || viewMode === 'HUMIDITY') {
        datasets.push({
          label: `💧 ${dev.name} - Humid (%)`,
          data: labels.map((_, index) => {
            if (deviceLogs.length === 0) return null;
            const log = deviceLogs[Math.floor((index / labels.length) * deviceLogs.length)];
            return Number(log?.air_humidity || log?.humidity) || null;
          }),
          borderColor: '#06b6d4',
          yAxisID: 'y2',
          borderDash: viewMode === 'ALL_METRICS' ? [2, 2] : [],
          tension: 0.4,
          spanGaps: true
        });
      }
    });

    return { labels, datasets };
  }, [data, timeframe, viewMode, selectedDeviceMac, mounted, devices]);

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top', labels: { color: isDark ? '#cbd5e1' : '#475569', font: { size: 9 } } },
    },
    scales: {
      x: { ticks: { color: isDark ? '#64748b' : '#94a3b8', font: { size: 10 } }, grid: { display: false } },
      
      // 🌟 แก้สเกลน้ำแกน Y ด้านซ้ายให้แสดง 0-45 cm (เพื่อให้กราฟน้ำไม่ล้นขอบบนตอนน้ำเต็ม 40)
      y: { display: viewMode !== 'TEMP' && viewMode !== 'HUMIDITY', position: 'left', min: 0, max: 45, ticks: { color: '#3b82f6' } },
      
      y1: { display: viewMode === 'ALL_METRICS' || viewMode === 'TEMP', position: 'right', min: 10, max: 50, ticks: { color: '#f97316' }, grid: { display: false } },
      y2: { display: viewMode === 'ALL_METRICS' || viewMode === 'HUMIDITY', position: 'right', min: 0, max: 100, ticks: { color: '#06b6d4' }, grid: { display: false } }
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-1">
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setViewMode('ALL_METRICS')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${viewMode === 'ALL_METRICS' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 border'}`}>📊 ทั้งหมด</button>
        <button onClick={() => setViewMode('LEVEL')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${viewMode === 'LEVEL' ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-600'}`}>🌊 น้ำ</button>
        <button onClick={() => setViewMode('TEMP')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${viewMode === 'TEMP' ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-600'}`}>🌡️ Temp</button>
        <button onClick={() => setViewMode('HUMIDITY')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${viewMode === 'HUMIDITY' ? 'bg-cyan-500 text-white' : 'bg-cyan-50 text-cyan-600'}`}>💧 Humid</button>
      </div>
      <div className="flex-grow min-h-[350px]"><Line data={chartData} options={options} /></div>
    </div>
  );
}