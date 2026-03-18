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
      if (timeframe === 'day') { d.setHours(d.getHours() - i); labels.push(d.getHours() + ':00'); }
      else { d.setDate(d.getDate() - i); labels.push(d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })); }
    }

    const datasets: any[] = [];
    const colors = ['#3b82f6', '#8b5cf6', '#10b981'];

    devices.forEach((dev: any, idx: number) => {
      if (selectedDeviceMac !== 'ALL' && dev.mac !== selectedDeviceMac) return;
      const deviceLogs = data.filter((l: any) => (l.mac || l.device_id) === dev.mac);
      
      let chartLabel = `🌊 ${dev.name}`;
      let dataMap = deviceLogs.map(l => {
         if (viewMode === 'LEVEL') {
            const raw = Number(l.level || 84);
            let v = (84.0 - raw) - 5.0;
            return v < 0 ? 0 : (v > 40 ? 40 : v);
         }
         return viewMode === 'TEMP' ? l.temperature : l.air_humidity;
      });

      datasets.push({
        label: chartLabel,
        data: labels.map((_, i) => dataMap[Math.floor((i / labels.length) * dataMap.length)]),
        borderColor: colors[idx % colors.length],
        backgroundColor: colors[idx % colors.length] + '20',
        fill: true, tension: 0.4, spanGaps: true
      });
    });

    return { labels, datasets };
  }, [data, timeframe, viewMode, selectedDeviceMac, mounted, devices]);

  if (!mounted || data.length === 0) return <div className="h-full flex flex-col items-center justify-center text-slate-400 font-black text-xs uppercase tracking-widest"><Activity className="animate-pulse mb-2" size={32}/> Waiting for signal...</div>;

  return (
    <div className="w-full h-full flex flex-col">
       <div className="flex gap-2 mb-6">
          {['LEVEL', 'TEMP', 'HUMIDITY'].map(m => (
            <button key={m} onClick={() => setViewMode(m as any)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${viewMode === m ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-100 text-slate-400'}`}>{m}</button>
          ))}
       </div>
       <div className="flex-grow min-h-[300px]"><Line data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { min: 0 } } }} /></div>
    </div>
  );
}