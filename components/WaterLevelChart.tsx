'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [viewMode, setViewMode] = useState<'LEVEL' | 'TEMP' | 'HUMIDITY'>('LEVEL');
  const [mounted, setMounted] = useState(false);
  const chartRef = useRef<any>(null);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const now = new Date();
  const labels: string[] = [];
  const safeData = Array.isArray(data) ? data : [];
  const safeDevices = Array.isArray(devices) ? devices : [];

  const activeDevices = selectedDeviceMac === 'ALL'
    ? safeDevices
    : safeDevices.filter((d: any) => d.mac === selectedDeviceMac);

  const deviceData: any = {};
  activeDevices.forEach((d: any) => {
    deviceData[d.mac] = { levels: [], temps: [], humidities: [] };
  });

  const getDate = (item: any) => {
    const d = new Date(item?.timestamp || item?.createdAt || item?.date);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  // ดึงข้อมูล 24 ชั่วโมงย้อนหลัง
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 3600000);
    const label = d.getHours() + ':00';
    labels.push(label);

    activeDevices.forEach((device: any) => {
      const matched = safeData.filter((item) => {
        const it = getDate(item);
        return it.getHours() === d.getHours() && it.toDateString() === d.toDateString() &&
               String(item?.mac || '').toLowerCase() === String(device.mac).toLowerCase();
      });

      if (matched.length === 0) {
        deviceData[device.mac].levels.push(null);
        deviceData[device.mac].temps.push(null);
        deviceData[device.mac].humidities.push(null);
      } else {
        const last = matched[matched.length - 1];
        const valL = Number(last?.level ?? null);
        const valT = Number(last?.temperature ?? null);
        const valH = Number(last?.air_humidity ?? last?.humidity ?? null);
        
        deviceData[device.mac].levels.push(valL === 0 ? null : valL);
        deviceData[device.mac].temps.push(valT === 0 ? null : valT);
        deviceData[device.mac].humidities.push(valH === 0 ? null : valH);
      }
    });
  }

  const getThemeColor = () => {
    if (viewMode === 'LEVEL') return { main: '#3b82f6', light: 'rgba(59, 130, 246, 0.2)', bg: 'rgba(59, 130, 246, 0.05)' };
    if (viewMode === 'TEMP') return { main: '#f97316', light: 'rgba(249, 115, 22, 0.2)', bg: 'rgba(249, 115, 22, 0.05)' };
    return { main: '#06b6d4', light: 'rgba(6, 182, 212, 0.2)', bg: 'rgba(6, 182, 212, 0.05)' };
  };

  const theme = getThemeColor();

  const datasets = activeDevices.map((d: any) => {
    const config = {
      label: viewMode === 'LEVEL' ? `ระดับน้ำ (${d.name})` : viewMode === 'TEMP' ? `อุณหภูมิ (${d.name})` : `ความชื้น (${d.name})`,
      data: viewMode === 'LEVEL' ? deviceData[d.mac].levels : viewMode === 'TEMP' ? deviceData[d.mac].temps : deviceData[d.mac].humidities,
      borderColor: theme.main,
      backgroundColor: (context: any) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, theme.light);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        return gradient;
      },
      borderWidth: 3,
      pointRadius: 0, // ซ่อนจุดปกติเพื่อให้ดู Clean
      pointHoverRadius: 6,
      pointBackgroundColor: theme.main,
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      tension: 0.4, // ความโค้งมน
      fill: true,
      spanGaps: true,
    };
    return config;
  });

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        left: 10,
        right: 20,
        top: 20,
        bottom: 10
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          boxWidth: 8,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          color: isDark ? '#94a3b8' : '#64748b',
          font: { size: 12, weight: '600' }
        }
      },
      tooltip: {
        backgroundColor: isDark ? '#1e293b' : '#fff',
        titleColor: isDark ? '#f8fafc' : '#1e293b',
        bodyColor: isDark ? '#94a3b8' : '#64748b',
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 12,
        displayColors: true,
        usePointStyle: true,
        callbacks: {
          label: (context: any) => ` ${context.dataset.label}: ${context.parsed.y} ${viewMode === 'LEVEL' ? 'cm' : viewMode === 'TEMP' ? '°C' : '%'}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: isDark ? '#64748b' : '#94a3b8',
          font: { size: 10 },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8 // ป้องกันชื่อแกน X เบียดกันจนตกขอบ
        }
      },
      y: {
        grid: {
          color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        },
        border: { display: false },
        ticks: {
          color: isDark ? '#64748b' : '#94a3b8',
          font: { size: 11 },
          padding: 10
        }
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Tab Switcher */}
      <div className="flex justify-start gap-2 mb-6 p-1 bg-slate-100 dark:bg-white/5 w-fit rounded-2xl border border-slate-200 dark:border-white/10">
        {[
          { key: 'LEVEL', label: 'ระดับน้ำ', color: 'bg-blue-500', text: 'text-blue-600' },
          { key: 'TEMP', label: 'อุณหภูมิ', color: 'bg-orange-500', text: 'text-orange-600' },
          { key: 'HUMIDITY', label: 'ความชื้น', color: 'bg-cyan-500', text: 'text-cyan-600' }
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setViewMode(item.key as any)}
            className={`px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
              viewMode === item.key 
                ? `${item.color} text-white shadow-sm` 
                : 'text-slate-500 hover:bg-white dark:hover:bg-white/5'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex-grow relative min-h-[300px]">
        <Line ref={chartRef} data={{ labels, datasets }} options={options} />
      </div>
    </div>
  );
}