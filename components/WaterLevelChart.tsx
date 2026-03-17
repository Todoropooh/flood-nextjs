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

  // ป้องกัน Hydration Error และ Client-side Exception
  useEffect(() => {
    setMounted(true);
  }, []);

  const chartData = useMemo(() => {
    if (!mounted || !Array.isArray(data) || data.length === 0) {
      return { labels: [], datasets: [] };
    }

    // 1. กรองข้อมูล
    const filteredData = selectedDeviceMac === 'ALL' 
      ? data 
      : data.filter((item: any) => String(item?.mac || '').toLowerCase() === String(selectedDeviceMac).toLowerCase());

    if (filteredData.length === 0) return { labels: [], datasets: [] };

    // 2. สร้าง Labels (จำกัดไม่ให้เยอะเกินไปจนเบราว์เซอร์ค้าง)
    const labels = filteredData.map((item: any) => {
      const d = new Date(item.createdAt || item.timestamp);
      return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    }).slice(-50); // เอาแค่ 50 จุดล่าสุดพอ

    // 3. แยกเส้นตามเครื่อง
    const macGroups: any = {};
    filteredData.slice(-50).forEach((item: any) => {
      if (!macGroups[item.mac]) macGroups[item.mac] = [];
      macGroups[item.mac].push(item);
    });

    const datasets = Object.keys(macGroups).map((mac, index) => {
      const deviceName = devices.find((d: any) => d.mac === mac)?.name || 'Device ' + (index + 1);
      const colorList = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
      const color = colorList[index % colorList.length];

      return {
        label: `${viewMode === 'LEVEL' ? 'ระดับน้ำ' : viewMode === 'TEMP' ? 'อุณหภูมิ' : 'ความชื้น'} (${deviceName})`,
        data: macGroups[mac].map((item: any) => {
          if (viewMode === 'LEVEL') return Number(item.level) || 0;
          if (viewMode === 'TEMP') return Number(item.temperature) || 0;
          return Number(item.air_humidity || item.humidity || 0);
        }),
        borderColor: color,
        backgroundColor: color + '22', // ใช้สีธรรมดาแทน Gradient เพื่อกัน Crash
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.3,
        fill: true,
        spanGaps: true,
      };
    });

    return { labels, datasets };
  }, [data, viewMode, selectedDeviceMac, devices, mounted]);

  if (!mounted) return <div className="h-[400px] bg-slate-100 animate-pulse rounded-3xl" />;

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: { color: isDark ? '#cbd5e1' : '#475569', font: { size: 10 } }
      }
    },
    scales: {
      x: { 
        ticks: { color: isDark ? '#64748b' : '#94a3b8', maxRotation: 0, font: { size: 9 } },
        grid: { display: false }
      },
      y: { 
        ticks: { color: isDark ? '#64748b' : '#94a3b8' },
        grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-2">
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {['LEVEL', 'TEMP', 'HUMIDITY'].map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode as any)}
            className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${
              viewMode === mode 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {mode === 'LEVEL' ? '🌊 น้ำ' : mode === 'TEMP' ? '🌡️ อุณหภูมิ' : '💧 ความชื้น'}
          </button>
        ))}
      </div>

      <div className="flex-grow min-h-[300px]">
        {chartData.datasets.length > 0 ? (
          <Line data={chartData} options={options} />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
            ยังไม่มีข้อมูลแสดงผล...
          </div>
        )}
      </div>
    </div>
  );
}