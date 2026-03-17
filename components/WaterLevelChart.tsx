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
  devices = [],
  selectedDeviceMac = 'ALL'
}: any) {
  const [viewMode, setViewMode] = useState<'LEVEL' | 'TEMP' | 'HUMIDITY' | 'ALL_METRICS'>('ALL_METRICS');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const chartData = useMemo(() => {
    if (!mounted || !Array.isArray(data) || data.length === 0) return { labels: [], datasets: [] };

    // 1. กรองข้อมูลตามเครื่องที่เลือก (รองรับทั้ง mac และ device_id)
    const filteredData = selectedDeviceMac === 'ALL' 
      ? data 
      : data.filter((item: any) => {
          const itemMac = String(item?.mac || item?.device_id || '').toLowerCase();
          return itemMac === String(selectedDeviceMac).toLowerCase();
        });

    if (filteredData.length === 0) return { labels: [], datasets: [] };

    // 2. สร้าง Labels (เวลา) - แสดงตามข้อมูลจริงที่ได้รับมาทั้งหมด (ไม่ตัด slice)
    const labels = filteredData.map((item: any) => {
      const d = new Date(item.createdAt || item.timestamp);
      // ถ้าเป็นข้อมูลย้อนหลังหลายวัน ให้แสดงวันที่ด้วย
      return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    });

    // 3. ฟังก์ชันสร้าง Dataset
    const createDataset = (label: string, key: string, color: string, yAxisID: string) => ({
      label: label,
      data: filteredData.map((item: any) => {
        if (key === 'level') return Number(item.level ?? item.water_level ?? 0);
        if (key === 'temp') return Number(item.temperature ?? 0);
        return Number(item.air_humidity || item.humidity || 0);
      }),
      borderColor: color,
      backgroundColor: color + '15',
      borderWidth: 2, // ปรับให้เส้นบางลงหน่อยถ้าข้อมูลเยอะ (Week/Month)
      pointRadius: filteredData.length > 50 ? 0 : 3, // ถ้าจุดเยอะเกินไปให้ซ่อนจุดเพื่อให้กราฟลื่น
      pointHoverRadius: 6,
      tension: 0.3,
      fill: true,
      yAxisID: yAxisID,
      spanGaps: true
    });

    const datasets: any[] = [];
    if (viewMode === 'ALL_METRICS') {
      datasets.push(createDataset('🌊 ระดับน้ำ (cm)', 'level', '#3b82f6', 'y'));
      datasets.push(createDataset('🌡️ อุณหภูมิ (°C)', 'temp', '#f97316', 'y1'));
      datasets.push(createDataset('💧 ความชื้น (%)', 'humid', '#06b6d4', 'y2'));
    } else {
      if (viewMode === 'LEVEL') datasets.push(createDataset('🌊 ระดับน้ำ (cm)', 'level', '#3b82f6', 'y'));
      if (viewMode === 'TEMP') datasets.push(createDataset('🌡️ อุณหภูมิ (°C)', 'temp', '#f97316', 'y'));
      if (viewMode === 'HUMIDITY') datasets.push(createDataset('💧 ความชื้น (%)', 'humid', '#06b6d4', 'y'));
    }

    return { labels, datasets };
  }, [data, viewMode, selectedDeviceMac, mounted]);

  if (!mounted) return <div className="h-[400px] bg-slate-100 dark:bg-slate-800 animate-pulse rounded-3xl" />;

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: { 
          color: isDark ? '#cbd5e1' : '#475569',
          usePointStyle: true,
          font: { size: 11, weight: 'bold' }
        }
      }
    },
    scales: {
      x: { 
        ticks: { 
          color: isDark ? '#64748b' : '#94a3b8', 
          font: { size: 10 },
          maxTicksLimit: 10 // ช่วยให้เวลาข้อมูลเยอะๆ ตัวอักษรแกน X ไม่ซ้อนกัน
        },
        grid: { display: false }
      },
      y: {
        type: 'linear', display: true, position: 'left',
        ticks: { color: '#3b82f6' },
        grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
      },
      y1: {
        type: 'linear', display: viewMode === 'ALL_METRICS', position: 'right',
        ticks: { color: '#f97316' },
        grid: { drawOnChartArea: false }
      },
      y2: {
        type: 'linear', display: viewMode === 'ALL_METRICS', position: 'right',
        ticks: { color: '#06b6d4' },
        grid: { drawOnChartArea: false },
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-2">
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setViewMode('ALL_METRICS')}
          className={`px-4 py-2 rounded-xl text-[11px] font-black tracking-widest uppercase transition-all ${
            viewMode === 'ALL_METRICS' 
              ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xl scale-105' 
              : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
          }`}
        >
          📊 แสดงทั้งหมด
        </button>
        <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />
        <button onClick={() => setViewMode('LEVEL')} className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all ${viewMode === 'LEVEL' ? 'bg-blue-500 text-white shadow-lg' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>🌊 น้ำ</button>
        <button onClick={() => setViewMode('TEMP')} className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all ${viewMode === 'TEMP' ? 'bg-orange-500 text-white shadow-lg' : 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'}`}>🌡️ อุณหภูมิ</button>
        <button onClick={() => setViewMode('HUMIDITY')} className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all ${viewMode === 'HUMIDITY' ? 'bg-cyan-500 text-white shadow-lg' : 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400'}`}>💧 ความชื้น</button>
      </div>

      <div className="flex-grow min-h-[350px] relative">
        {chartData.datasets.length > 0 ? (
          <Line data={chartData} options={options} />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs italic border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem]">
            ไม่มีข้อมูลในช่วงเวลาที่เลือก...
          </div>
        )}
      </div>
    </div>
  );
}