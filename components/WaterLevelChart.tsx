'use client';

import { useState, useEffect, useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Activity } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

export default function WaterLevelChart({ data = [], isDark, timeframe = 'day', devices = [], selectedDeviceMac = 'ALL' }: any) {
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'LEVEL' | 'TEMP' | 'HUMIDITY'>('LEVEL');

  useEffect(() => { setMounted(true); }, []);

  const chartData = useMemo(() => {
    if (!mounted || !data.length || !devices.length) return { labels: [], datasets: [] };
    
    const labels: string[] = [];
    const now = new Date();
    let steps = timeframe === 'day' ? 24 : timeframe === 'week' ? 7 : 30;
    
    for (let i = steps - 1; i >= 0; i--) {
      const d = new Date(now);
      if (timeframe === 'day') { 
        d.setHours(d.getHours() - i); 
        labels.push(d.getHours() + ':00'); 
      }
      else { 
        d.setDate(d.getDate() - i); 
        labels.push(d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })); 
      }
    }

    const datasets: any[] = [];
    const colors = {
      blue: { stroke: '#3b82f6', fill: '#3b82f620' },
      orange: { stroke: '#f97316', fill: '#f9731620' },
      cyan: { stroke: '#06b6d4', fill: '#06b6d420' },
      purple: { stroke: '#8b5cf6', fill: '#8b5cf620' }
    };

    const colorPalette = [colors.blue, colors.purple, colors.cyan, colors.orange];

    devices.forEach((dev: any, idx: number) => {
      if (selectedDeviceMac !== 'ALL' && dev.mac !== selectedDeviceMac) return;
      
      const deviceLogs = data.filter((l: any) => (l.mac || l.device_id) === dev.mac);
      if (deviceLogs.length === 0) return;

      const activeColor = viewMode === 'LEVEL' ? colorPalette[idx % colorPalette.length] 
                        : viewMode === 'TEMP' ? colors.orange 
                        : colors.cyan;

      let chartLabel = viewMode === 'LEVEL' ? `🌊 ${dev.name} (cm)` 
                     : viewMode === 'TEMP' ? `🌡️ ${dev.name} (°C)` 
                     : `💧 ${dev.name} (%)`;

      const dataPoints = labels.map((_, i) => {
        const logIndex = Math.floor((i / labels.length) * deviceLogs.length);
        const log = deviceLogs[logIndex];
        if (!log) return null;

        if (viewMode === 'LEVEL') {
          // 🌟 [ปรับปรุง] ดึงระยะติดตั้ง (installHeight) ของอุปกรณ์ตัวนี้มาคำนวณกราฟ
          const h = dev.installHeight ?? 62.0; 
          const raw = Number(log.level || h);
          
          let v = (h - raw); 
          
          // กรอง Noise อิงตามระยะติดตั้งจริง
          if (raw <= 0.5 || raw > (h + 10)) v = 0;
          return v < 0 ? 0 : (v > 40 ? 40 : v);
        }
        return viewMode === 'TEMP' ? Number(log.temperature) : Number(log.air_humidity || log.humidity);
      });

      datasets.push({
        label: chartLabel,
        data: dataPoints,
        borderColor: activeColor.stroke,
        backgroundColor: activeColor.fill,
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5,
        borderWidth: 3,
        spanGaps: true
      });
    });

    return { labels, datasets };
  }, [data, timeframe, viewMode, selectedDeviceMac, mounted, devices]);

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: selectedDeviceMac === 'ALL',
        position: 'top',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          color: isDark ? '#94a3b8' : '#475569',
          font: { size: 10, weight: 'bold' }
        }
      },
      tooltip: {
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        titleColor: isDark ? '#ffffff' : '#1e293b',
        bodyColor: isDark ? '#cbd5e1' : '#475569',
        borderColor: isDark ? '#334155' : '#e2e8f0',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: isDark ? '#64748b' : '#94a3b8', font: { size: 10 } }
      },
      y: {
        beginAtZero: true,
        max: viewMode === 'LEVEL' ? 45 : viewMode === 'TEMP' ? 60 : 100,
        grid: { color: isDark ? '#1e293b' : '#f1f5f9' },
        ticks: { color: isDark ? '#64748b' : '#94a3b8', font: { weight: 'bold' } }
      }
    }
  };

  if (!mounted || data.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 font-black text-xs uppercase tracking-widest">
        <Activity className="animate-pulse mb-3" size={40}/>
        Waiting for data signal...
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex flex-wrap gap-2 mb-6">
        <button 
          onClick={() => setViewMode('LEVEL')} 
          className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all duration-300 shadow-sm ${viewMode === 'LEVEL' ? 'bg-blue-600 text-white shadow-blue-500/30 scale-105' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600'}`}
        >
          🌊 Water Level
        </button>
        <button 
          onClick={() => setViewMode('TEMP')} 
          className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all duration-300 shadow-sm ${viewMode === 'TEMP' ? 'bg-orange-500 text-white shadow-orange-500/30 scale-105' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600'}`}
        >
          🌡️ Temperature
        </button>
        <button 
          onClick={() => setViewMode('HUMIDITY')} 
          className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all duration-300 shadow-sm ${viewMode === 'HUMIDITY' ? 'bg-cyan-500 text-white shadow-cyan-500/30 scale-105' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600'}`}
        >
          💧 Humidity
        </button>
      </div>

      <div className="flex-grow min-h-[350px]">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}