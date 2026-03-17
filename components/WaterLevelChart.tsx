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
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const labels: string[] = [];
  const now = new Date();

  const safeDevices = Array.isArray(devices) ? devices : [];
  const safeData = Array.isArray(data) ? data : [];

  const activeDevices = selectedDeviceMac === 'ALL' 
    ? (safeDevices.length > 0 ? safeDevices : [{ mac: 'ALL', name: 'โหนดจำลอง' }])
    : safeDevices.filter(d => d?.mac === selectedDeviceMac);

  const isOverview = activeDevices.length > 1 || selectedDeviceMac === 'ALL';

  useEffect(() => {
    if (isOverview && viewMode === 'ALL') setViewMode('LEVEL');
  }, [isOverview, viewMode]);

  if (!mounted) {
    return (
      <div className="flex flex-col h-full w-full">
        <div className="flex-1 flex items-center justify-center bg-slate-100/50 rounded-2xl animate-pulse">
          <span className="text-slate-400 text-sm">กำลังโหลดกราฟ...</span>
        </div>
      </div>
    );
  }

  const getItemDate = (item: any) => {
    const d = new Date(item?.timestamp || item?.createdAt || item?.date);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const deviceData: Record<string, any> = {};
  activeDevices.forEach(d => {
    if (d?.mac) deviceData[d.mac] = { levels: [], temps: [], humidities: [] };
  });

  const processBucket = (label: string, matched: any[]) => {
    labels.push(label);

    activeDevices.forEach(d => {
      if (!d?.mac) return;

      let logs = matched.filter(log =>
        String(log?.mac || log?.device_id || '').toLowerCase() === String(d.mac).toLowerCase()
      );

      if (logs.length === 0 && matched.length > 0) {
        logs = [matched[matched.length - 1]];
      }

      if (logs.length > 0) {
        const last = logs[logs.length - 1];

        const level = Number(last?.water_level ?? last?.level ?? null);
        const temp = Number(last?.temperature ?? last?.temp ?? null);
        const humid = Number(last?.air_humidity ?? last?.humidity ?? null);

        deviceData[d.mac].levels.push(isNaN(level) ? null : level);
        deviceData[d.mac].temps.push(isNaN(temp) ? null : temp);
        deviceData[d.mac].humidities.push(isNaN(humid) ? null : humid);

      } else {
        deviceData[d.mac].levels.push(null);
        deviceData[d.mac].temps.push(null);
        deviceData[d.mac].humidities.push(null);
      }
    });
  };

  // ⏱️ Generate time buckets
  if (timeframe === 'month') {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const matched = safeData.filter(item => getItemDate(item).toDateString() === d.toDateString());
      processBucket(d.getDate().toString(), matched);
    }
  } else {
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 3600000);
      const matched = safeData.filter(item => {
        const it = getItemDate(item);
        return it.getHours() === d.getHours() && it.toDateString() === d.toDateString();
      });
      processBucket(d.getHours() + ':00', matched);
    }
  }

  const datasets: any[] = [];

  activeDevices.forEach((d, i) => {
    if (!d?.mac) return;
    const dat = deviceData[d.mac];

    if (viewMode === 'LEVEL' || viewMode === 'ALL') {
      datasets.push({
        label: isOverview ? `${d.name} (น้ำ)` : 'ระดับน้ำ (cm)',
        data: dat.levels,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.1)',
        borderWidth: 3,
        tension: 0.4,
        cubicInterpolationMode: 'monotone',
        spanGaps: true,
        fill: true,
        yAxisID: 'y'
      });
    }

    if (viewMode === 'TEMP' || viewMode === 'ALL') {
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

    if (viewMode === 'HUMIDITY' || viewMode === 'ALL') {
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

  // 🔥 AUTO SCALE (แก้กราฟจม)
  const getMinMax = (arr: any[]) => {
    const clean = arr.filter(v => v !== null && !isNaN(v));
    if (clean.length === 0) return { min: 0, max: 10 };
    return {
      min: Math.min(...clean),
      max: Math.max(...clean)
    };
  };

  const levelData = datasets.filter(d => d.yAxisID === 'y').flatMap(d => d.data);
  const tempData = datasets.filter(d => d.yAxisID === 'y1').flatMap(d => d.data);
  const humidData = datasets.filter(d => d.yAxisID === 'y2').flatMap(d => d.data);

  const level = getMinMax(levelData);
  const temp = getMinMax(tempData);
  const humid = getMinMax(humidData);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 10, bottom: 10 }
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
        ticks: { color: '#64748b' }
      },

      y: {
        display: viewMode === 'LEVEL' || viewMode === 'ALL',
        position: 'left',
        beginAtZero: false,
        suggestedMin: level.min - 1,
        suggestedMax: level.max + 1
      },

      y1: {
        display: viewMode === 'TEMP' || viewMode === 'ALL',
        position: 'right',
        grid: { drawOnChartArea: false },
        suggestedMin: temp.min - 2,
        suggestedMax: temp.max + 2
      },

      y2: {
        display: viewMode === 'HUMIDITY' || viewMode === 'ALL',
        position: 'right',
        grid: { drawOnChartArea: false },
        suggestedMin: humid.min - 5,
        suggestedMax: humid.max + 5
      }
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex justify-center gap-2 mb-4">
        <button onClick={() => setViewMode('LEVEL')} className="px-3 py-1 bg-blue-500 text-white rounded-full text-xs">น้ำ</button>
        <button onClick={() => setViewMode('TEMP')} className="px-3 py-1 bg-orange-500 text-white rounded-full text-xs">อุณหภูมิ</button>
        <button onClick={() => setViewMode('HUMIDITY')} className="px-3 py-1 bg-cyan-500 text-white rounded-full text-xs">ความชื้น</button>
      </div>

      <div className="flex-1 min-h-[400px]">
        {/* @ts-ignore */}
        <Line data={{ labels, datasets }} options={options} />
      </div>
    </div>
  );
}
