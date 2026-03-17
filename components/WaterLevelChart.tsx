'use client';

import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
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

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-[400px] flex items-center justify-center animate-pulse">Loading...</div>;
  }

  const now = new Date();
  const labels: string[] = [];

  const safeData = Array.isArray(data) ? data : [];
  const safeDevices = Array.isArray(devices) ? devices : [];

  const activeDevices =
    selectedDeviceMac === 'ALL'
      ? safeDevices
      : safeDevices.filter((d: any) => d.mac === selectedDeviceMac);

  const deviceData: any = {};

  activeDevices.forEach((d: any) => {
    deviceData[d.mac] = {
      levels: [],
      temps: [],
      humidities: []
    };
  });

  const getDate = (item: any) => {
    const d = new Date(item?.timestamp || item?.createdAt || item?.date);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const processBucket = (label: string, matched: any[]) => {
    labels.push(label);

    activeDevices.forEach((d: any) => {
      const logs = matched.filter(
        (log) =>
          String(log?.mac || log?.device_id || '').toLowerCase() ===
          String(d.mac).toLowerCase()
      );

      if (logs.length === 0) {
        // ✅ แก้: ไม่มีข้อมูล = null (ไม่มั่ว)
        deviceData[d.mac].levels.push(null);
        deviceData[d.mac].temps.push(null);
        deviceData[d.mac].humidities.push(null);
        return;
      }

      const last = logs[logs.length - 1];

      // ✅ แก้: ไม่เอา 0 มาทำกราฟดิ่ง
      const level = Number(last?.water_level ?? last?.level ?? null);
      const temp = Number(last?.temperature ?? last?.temp ?? null);
      const humid = Number(last?.air_humidity ?? last?.humidity ?? null);

      deviceData[d.mac].levels.push(level === 0 || isNaN(level) ? null : level);
      deviceData[d.mac].temps.push(isNaN(temp) ? null : temp);
      deviceData[d.mac].humidities.push(isNaN(humid) ? null : humid);
    });
  };

  // time loop
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 3600000);
    const matched = safeData.filter((item) => {
      const it = getDate(item);
      return it.getHours() === d.getHours() && it.toDateString() === d.toDateString();
    });

    processBucket(d.getHours() + ':00', matched);
  }

  const datasets: any[] = [];

  activeDevices.forEach((d: any) => {
    const dat = deviceData[d.mac];

    if (viewMode === 'LEVEL') {
      datasets.push({
        label: 'ระดับน้ำ',
        data: dat.levels,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.15)',
        borderWidth: 3,
        pointRadius: 3,
        pointHoverRadius: 6,
        tension: 0.45,
        cubicInterpolationMode: 'monotone',
        fill: true,
        spanGaps: true,
        yAxisID: 'y'
      });
    }

    if (viewMode === 'TEMP') {
      datasets.push({
        label: 'อุณหภูมิ',
        data: dat.temps,
        borderColor: '#f97316',
        borderWidth: 2,
        tension: 0.4,
        spanGaps: true,
        yAxisID: 'y1'
      });
    }

    if (viewMode === 'HUMIDITY') {
      datasets.push({
        label: 'ความชื้น',
        data: dat.humidities,
        borderColor: '#06b6d4',
        borderWidth: 2,
        tension: 0.4,
        spanGaps: true,
        yAxisID: 'y2'
      });
    }
  });

  // ✅ auto scale
  const getMinMax = (arr: any[]) => {
    const clean = arr.filter((v) => v !== null);
    if (clean.length === 0) return { min: 0, max: 10 };
    return { min: Math.min(...clean), max: Math.max(...clean) };
  };

  const level = getMinMax(datasets.flatMap((d) => d.data));

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,

    animation: {
      duration: 800,
      easing: 'easeOutQuart'
    },

    plugins: {
      legend: {
        labels: {
          color: isDark ? '#cbd5e1' : '#475569'
        }
      }
    },

    scales: {
      x: {
        grid: { color: 'rgba(0,0,0,0.05)' }
      },

      y: {
        beginAtZero: false,
        suggestedMin: level.min - 1,
        suggestedMax: level.max + 1
      }
    }
  };

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-lg p-6 border border-white/30">

      <div className="flex justify-center gap-3 mb-4">
        <button onClick={() => setViewMode('LEVEL')} className="px-4 py-1 bg-blue-500 text-white rounded-full text-xs">น้ำ</button>
        <button onClick={() => setViewMode('TEMP')} className="px-4 py-1 bg-orange-500 text-white rounded-full text-xs">อุณหภูมิ</button>
        <button onClick={() => setViewMode('HUMIDITY')} className="px-4 py-1 bg-cyan-500 text-white rounded-full text-xs">ความชื้น</button>
      </div>

      <div className="h-[400px]">
        {/* @ts-ignore */}
        <Line data={{ labels, datasets }} options={options} />
      </div>
    </div>
  );
}
