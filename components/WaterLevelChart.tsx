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

    const filtered = selectedDeviceMac === 'ALL' 
      ? data 
      : data.filter((item: any) => String(item?.mac || '').toLowerCase() === String(selectedDeviceMac).toLowerCase());

    // --- Logic สร้างแกน X ย้อนหลังแบบ Dynamic ---
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

    const createDataset = (label: string, key: string, color: string, yAxisID: string) => ({
      label,
      data: labels.map((_, index) => {
        if (filtered.length === 0) return null;
        const dataIndex = Math.floor((index / labels.length) * filtered.length);
        const log = filtered[dataIndex];
        
        if (key === 'level') {
          // ✅ เปลี่ยนค่าระยะเซนเซอร์ เป็น "ความสูงน้ำในถังจริง (0-20cm)"
          const rawDist = Number(log?.level ?? log?.water_level);
          if (!rawDist || rawDist <= 0) return null;
          let waterInTank = 70 - rawDist; // อิงจากติดตั้งสูง 70 ซม.
          if (waterInTank < 0) waterInTank = 0;
          if (waterInTank > 20) waterInTank = 20;
          return waterInTank;
        }
        if (key === 'temp') return Number(log?.temperature) || null;
        return Number(log?.air_humidity ?? log?.humidity) || null;
      }),
      borderColor: color,
      backgroundColor: color + '15',
      borderWidth: 2,
      pointRadius: labels.length > 30 ? 0 : 3,
      tension: 0.4,
      fill: true,
      yAxisID,
      spanGaps: true
    });

    const datasets: any[] = [];
    if (viewMode === 'ALL_METRICS') {
      datasets.push(createDataset('🌊 ระดับน้ำในถัง (cm)', 'level', '#3b82f6', 'y'));
      datasets.push(createDataset('🌡️ อุณหภูมิ (°C)', 'temp', '#f97316', 'y1'));
      datasets.push(createDataset('💧 ความชื้น (%)', 'humid', '#06b6d4', 'y2'));
    } else {
      // ✅ แก้ให้ตอนแยกกราฟ ใช้ แกน Y ของตัวเอง ไม่ไปแย่งกันใช้แกน y อันเดียว
      const configMap: any = {
        LEVEL: ['🌊 ระดับน้ำในถัง (cm)', 'level', '#3b82f6', 'y'],
        TEMP: ['🌡️ อุณหภูมิ (°C)', 'temp', '#f97316', 'y1'],
        HUMIDITY: ['💧 ความชื้น (%)', 'humid', '#06b6d4', 'y2']
      };
      const [l, k, c, axis] = configMap[viewMode];
      datasets.push(createDataset(l, k, c, axis));
    }

    return { labels, datasets };
  }, [data, timeframe, viewMode, selectedDeviceMac, mounted]);

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { bottom: 30, left: 10, right: 20, top: 10 } },
    plugins: {
      legend: { 
        display: true, 
        position: 'top', 
        labels: { color: isDark ? '#cbd5e1' : '#475569', usePointStyle: true, font: { size: 11, weight: 'bold' } } 
      },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      x: { 
        ticks: { color: isDark ? '#64748b' : '#94a3b8', font: { size: 10 }, maxRotation: 45, minRotation: 45, autoSkip: true, maxTicksLimit: timeframe === 'day' ? 12 : 7 },
        grid: { display: false }
      },
      y: { 
        display: viewMode === 'ALL_METRICS' || viewMode === 'LEVEL',
        type: 'linear', 
        position: 'left',
        min: 0,
        max: 25, // ✅ ล็อกเพดานน้ำไว้ที่ 25 ซม. (เพื่อให้น้ำ 20 ซม. ไม่ทะลุขอบ)
        ticks: { color: '#3b82f6', font: { size: 10 }, stepSize: 5 },
        grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' } 
      },
      y1: { 
        display: viewMode === 'ALL_METRICS' || viewMode === 'TEMP',
        type: 'linear', 
        position: viewMode === 'ALL_METRICS' ? 'right' : 'left', // ✅ พอกดแยกดูอุณหภูมิ ให้ย้ายสเกลมาฝั่งซ้ายสวยๆ
        min: 10, max: 50, // ✅ ล็อกอุณหภูมิ 10-50 องศา
        ticks: { color: '#f97316', font: { size: 10 } }, 
        grid: { drawOnChartArea: false } 
      },
      y2: { 
        display: viewMode === 'ALL_METRICS' || viewMode === 'HUMIDITY',
        type: 'linear', 
        position: viewMode === 'ALL_METRICS' ? 'right' : 'left', // ✅ พอกดแยกดูความชื้น ให้ย้ายสเกลมาฝั่งซ้ายสวยๆ
        min: 0, max: 100, // ✅ ล็อกความชื้น 0-100%
        ticks: { color: '#06b6d4', font: { size: 10 } }, 
        grid: { drawOnChartArea: false } 
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-1">
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setViewMode('ALL_METRICS')} className={`px-4 py-2 rounded-xl text-[11px] font-black tracking-widest uppercase transition-all ${viewMode === 'ALL_METRICS' ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xl' : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'}`}>📊 ทั้งหมด</button>
        <button onClick={() => setViewMode('LEVEL')} className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all ${viewMode === 'LEVEL' ? 'bg-blue-500 text-white' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'}`}>🌊 น้ำ</button>
        <button onClick={() => setViewMode('TEMP')} className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all ${viewMode === 'TEMP' ? 'bg-orange-500 text-white' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600'}`}>🌡️ อุณหภูมิ</button>
        <button onClick={() => setViewMode('HUMIDITY')} className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all ${viewMode === 'HUMIDITY' ? 'bg-cyan-500 text-white' : 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600'}`}>💧 ความชื้น</button>
      </div>
      <div className="flex-grow min-h-[350px] relative">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}