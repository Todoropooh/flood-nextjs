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
  // เปลี่ยน viewMode ให้รองรับ 'ALL_METRICS' (แสดงทุกอย่างพร้อมกัน)
  const [viewMode, setViewMode] = useState<'LEVEL' | 'TEMP' | 'HUMIDITY' | 'ALL_METRICS'>('ALL_METRICS');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const chartData = useMemo(() => {
    if (!mounted || !Array.isArray(data) || data.length === 0) return { labels: [], datasets: [] };

    // 1. กรองข้อมูลตามเครื่องที่เลือก
    const filteredData = selectedDeviceMac === 'ALL' 
      ? data 
      : data.filter((item: any) => String(item?.mac || '').toLowerCase() === String(selectedDeviceMac).toLowerCase());

    if (filteredData.length === 0) return { labels: [], datasets: [] };

    // 2. สร้าง Labels (เวลา) เอาแค่ 30 จุดล่าสุดเพื่อให้กราฟไม่อัดแน่นเกินไป
    const recentData = filteredData.slice(-30);
    const labels = recentData.map((item: any) => {
      const d = new Date(item.createdAt || item.timestamp);
      return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    });

    // 3. ฟังก์ชันสร้าง Dataset แบบมาตรฐาน
    const createDataset = (label: string, key: string, color: string, yAxisID: string) => ({
      label: label,
      data: recentData.map((item: any) => {
        if (key === 'level') return Number(item.level) || 0;
        if (key === 'temp') return Number(item.temperature) || 0;
        return Number(item.air_humidity || item.humidity || 0);
      }),
      borderColor: color,
      backgroundColor: color + '15',
      borderWidth: 3,
      pointRadius: 3,
      pointHoverRadius: 6,
      tension: 0.4,
      fill: true,
      yAxisID: yAxisID,
      spanGaps: true
    });

    const datasets: any[] = [];

    if (viewMode === 'ALL_METRICS') {
      // 🌟 โหมดแสดงทั้งหมด: ใส่มา 3 เส้นคนละสี
      datasets.push(createDataset('🌊 ระดับน้ำ (cm)', 'level', '#3b82f6', 'y'));
      datasets.push(createDataset('🌡️ อุณหภูมิ (°C)', 'temp', '#f97316', 'y1'));
      datasets.push(createDataset('💧 ความชื้น (%)', 'humid', '#06b6d4', 'y2'));
    } else {
      // โหมดแยกดูทีละอย่าง
      if (viewMode === 'LEVEL') datasets.push(createDataset('🌊 ระดับน้ำ (cm)', 'level', '#3b82f6', 'y'));
      if (viewMode === 'TEMP') datasets.push(createDataset('🌡️ อุณหภูมิ (°C)', 'temp', '#f97316', 'y'));
      if (viewMode === 'HUMIDITY') datasets.push(createDataset('💧 ความชื้น (%)', 'humid', '#06b6d4', 'y'));
    }

    return { labels, datasets };
  }, [data, viewMode, selectedDeviceMac, mounted]);

  if (!mounted) return <div className="h-[400px] bg-slate-100 animate-pulse rounded-3xl" />;

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
      },
      tooltip: {
        backgroundColor: isDark ? '#1e293b' : '#fff',
        titleColor: isDark ? '#f8fafc' : '#1e293b',
        bodyColor: isDark ? '#94a3b8' : '#64748b',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        cornerRadius: 12,
        padding: 12
      }
    },
    scales: {
      x: { 
        ticks: { color: isDark ? '#64748b' : '#94a3b8', font: { size: 10 } },
        grid: { display: false }
      },
      y: { // แกน Y หลักสำหรับระดับน้ำ
        type: 'linear',
        display: true,
        position: 'left',
        ticks: { color: '#3b82f6' },
        grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
      },
      y1: { // แกน Y สำหรับอุณหภูมิ (ซ่อนไว้ถ้าไม่ใช้โหมด ALL)
        type: 'linear',
        display: viewMode === 'ALL_METRICS',
        position: 'right',
        ticks: { color: '#f97316' },
        grid: { drawOnChartArea: false }
      },
      y2: { // แกน Y สำหรับความชื้น (ซ่อนไว้ถ้าไม่ใช้โหมด ALL)
        type: 'linear',
        display: viewMode === 'ALL_METRICS',
        position: 'right',
        ticks: { color: '#06b6d4' },
        grid: { drawOnChartArea: false },
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-2">
      {/* 🔘 ปุ่มกดเลือกโหมด */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setViewMode('ALL_METRICS')}
          className={`px-4 py-2 rounded-xl text-[11px] font-black tracking-widest uppercase transition-all ${
            viewMode === 'ALL_METRICS' 
              ? 'bg-slate-900 text-white shadow-xl scale-105' 
              : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          📊 แสดงทั้งหมด
        </button>
        <div className="w-px h-8 bg-slate-200 mx-1 hidden sm:block" />
        <button onClick={() => setViewMode('LEVEL')} className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all ${viewMode === 'LEVEL' ? 'bg-blue-500 text-white shadow-lg' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>🌊 น้ำ</button>
        <button onClick={() => setViewMode('TEMP')} className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all ${viewMode === 'TEMP' ? 'bg-orange-500 text-white shadow-lg' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'}`}>🌡️ อุณหภูมิ</button>
        <button onClick={() => setViewMode('HUMIDITY')} className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all ${viewMode === 'HUMIDITY' ? 'bg-cyan-500 text-white shadow-lg' : 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100'}`}>💧 ความชื้น</button>
      </div>

      <div className="flex-grow min-h-[350px] relative">
        {chartData.datasets.length > 0 ? (
          <Line data={chartData} options={options} />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs italic border-2 border-dashed border-slate-200 rounded-[2rem]">
            กำลังดึงข้อมูลจาก Sensors...
          </div>
        )}
      </div>
    </div>
  );
}