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
  const [viewMode, setViewMode] = useState<'LEVEL' | 'TEMP' | 'HUMIDITY'>('LEVEL');
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // สุ่มสีสำหรับแต่ละอุปกรณ์ (กรณีแสดงทั้งหมด)
  const deviceColors: any = {
    'ALL': '#3b82f6',
  };

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return { labels: [], datasets: [] };

    // 1. กรองข้อมูลตาม Device ที่เลือก
    const filteredData = selectedDeviceMac === 'ALL' 
      ? data 
      : data.filter((item: any) => String(item.mac).toLowerCase() === String(selectedDeviceMac).toLowerCase());

    // 2. สร้าง Labels (เวลา) จากข้อมูลจริงที่มีอยู่ (Real-time)
    const labels = filteredData.map((item: any) => {
      const d = new Date(item.createdAt || item.timestamp);
      return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    });

    // 3. จัดกลุ่มข้อมูลตาม MAC Address เพื่อแยกเส้น
    const macGroups: any = {};
    filteredData.forEach((item: any) => {
      if (!macGroups[item.mac]) macGroups[item.mac] = [];
      macGroups[item.mac].push(item);
    });

    const datasets = Object.keys(macGroups).map((mac, index) => {
      const deviceName = devices.find((d: any) => d.mac === mac)?.name || mac;
      const colorList = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
      const color = colorList[index % colorList.length];

      return {
        label: `${viewMode === 'LEVEL' ? 'ระดับน้ำ' : viewMode === 'TEMP' ? 'อุณหภูมิ' : 'ความชื้น'} (${deviceName})`,
        data: macGroups[mac].map((item: any) => {
          if (viewMode === 'LEVEL') return item.level || null;
          if (viewMode === 'TEMP') return item.temperature || null;
          return item.air_humidity || item.humidity || null;
        }),
        borderColor: color,
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, color + '33'); // โปร่งแสง 20%
          gradient.addColorStop(1, 'transparent');
          return gradient;
        },
        borderWidth: 3,
        pointRadius: 4,
        pointBackgroundColor: color,
        pointBorderColor: '#fff',
        tension: 0.4,
        fill: true,
        spanGaps: true,
      };
    });

    return { labels, datasets };
  }, [data, viewMode, selectedDeviceMac, devices]);

  if (!mounted) return <div className="h-[400px] flex items-center justify-center animate-pulse text-slate-400">Loading Chart...</div>;

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { right: 20, top: 10 } },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          font: { size: 11, weight: 'bold' },
          color: isDark ? '#cbd5e1' : '#475569'
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: isDark ? '#1e293b' : '#fff',
        titleColor: isDark ? '#f8fafc' : '#1e293b',
        bodyColor: isDark ? '#94a3b8' : '#64748b',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        padding: 12,
        cornerRadius: 12,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { 
          color: isDark ? '#64748b' : '#94a3b8',
          maxTicksLimit: 10 
        }
      },
      y: {
        grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
        ticks: { color: isDark ? '#64748b' : '#94a3b8' }
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Selector Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button 
          onClick={() => setViewMode('LEVEL')} 
          className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all ${viewMode === 'LEVEL' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
        >
          🌊 ระดับน้ำ
        </button>
        <button 
          onClick={() => setViewMode('TEMP')} 
          className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all ${viewMode === 'TEMP' ? 'bg-orange-500 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
        >
          🌡️ อุณหภูมิ
        </button>
        <button 
          onClick={() => setViewMode('HUMIDITY')} 
          className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all ${viewMode === 'HUMIDITY' ? 'bg-cyan-500 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
        >
          💧 ความชื้น
        </button>
      </div>

      <div className="flex-grow min-h-[300px]">
        {chartData.labels.length > 0 ? (
          <Line data={chartData} options={options} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 border-2 border-dashed border-slate-100 rounded-3xl">
            <Database size={40} className="animate-bounce" />
            <p className="text-sm font-medium">กำลังรอข้อมูล Real-time...</p>
          </div>
        )}
      </div>
    </div>
  );
}