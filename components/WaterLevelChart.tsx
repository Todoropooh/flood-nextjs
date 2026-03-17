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

    // --- 1. สร้าง Labels แกน X (เวลา) ---
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
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

    // --- 2. วนลูปสร้างเส้นแยกตามอุปกรณ์ (Node) ---
    devices.forEach((dev: any, idx: number) => {
      // กรองตาม MAC ที่เลือก (ถ้าเลือก ALL จะดึงทุก Node)
      if (selectedDeviceMac !== 'ALL' && dev.mac !== selectedDeviceMac) return;

      const deviceLogs = data.filter((l: any) => l.mac === dev.mac);
      const nodeColor = colors[idx % colors.length];

      // --- สร้างข้อมูลระดับน้ำ (LEVEL) ---
      if (viewMode === 'ALL_METRICS' || viewMode === 'LEVEL') {
        datasets.push({
          label: `🌊 ${dev.name} - ระดับน้ำ (cm)`,
          data: labels.map((_, index) => {
            if (deviceLogs.length === 0) return null;
            // หา Log ที่เวลาใกล้เคียงที่สุดในช่องนั้นๆ
            const dataIndex = Math.floor((index / labels.length) * deviceLogs.length);
            const log = deviceLogs[dataIndex];
            
            // ✅ ใช้สูตรเดียวกับการ์ด: 95 - ระยะห่าง (INSTALL_HEIGHT = 95)
            const rawDist = Number(log?.level || log?.water_level || 0);
            if (rawDist <= 0.5 || rawDist > 80) return 0; // ปัดเป็น 0 ตาม Logic พี่
            let waterInTank = 95 - rawDist; 
            if (waterInTank < 0) waterInTank = 0;
            if (waterInTank > 20) waterInTank = 20;
            return waterInTank;
          }),
          borderColor: nodeColor,
          backgroundColor: nodeColor + '15',
          yAxisID: 'y',
          tension: 0.4,
          fill: viewMode === 'LEVEL', 
          spanGaps: true
        });
      }

      // --- สร้างข้อมูลอุณหภูมิ (TEMP) ---
      if (viewMode === 'ALL_METRICS' || viewMode === 'TEMP') {
        datasets.push({
          label: `🌡️ ${dev.name} - อุณหภูมิ (°C)`,
          data: labels.map((_, index) => {
            if (deviceLogs.length === 0) return null;
            const dataIndex = Math.floor((index / labels.length) * deviceLogs.length);
            return Number(deviceLogs[dataIndex]?.temperature) || null;
          }),
          borderColor: '#f97316',
          yAxisID: 'y1',
          borderDash: [5, 5], 
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
      legend: { display: true, position: 'top', labels: { color: isDark ? '#cbd5e1' : '#475569', font: { size: 10, weight: 'bold' } } },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      x: { ticks: { color: isDark ? '#64748b' : '#94a3b8', font: { size: 10 } }, grid: { display: false } },
      y: { 
        display: viewMode === 'ALL_METRICS' || viewMode === 'LEVEL',
        position: 'left', min: 0, max: 25,
        ticks: { color: '#3b82f6' },
        grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' } 
      },
      y1: { 
        display: viewMode === 'ALL_METRICS' || viewMode === 'TEMP',
        position: 'right', min: 10, max: 50,
        ticks: { color: '#f97316' },
        grid: { drawOnChartArea: false } 
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-1">
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setViewMode('ALL_METRICS')} className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase transition-all ${viewMode === 'ALL_METRICS' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'}`}>📊 ทั้งหมด</button>
        <button onClick={() => setViewMode('LEVEL')} className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all ${viewMode === 'LEVEL' ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-600'}`}>🌊 ระดับน้ำ</button>
        <button onClick={() => setViewMode('TEMP')} className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all ${viewMode === 'TEMP' ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-600'}`}>🌡️ อุณหภูมิ</button>
      </div>
      <div className="flex-grow min-h-[350px] relative">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}