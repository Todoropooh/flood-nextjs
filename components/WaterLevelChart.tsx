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
import { Activity } from 'lucide-react';

// 🌟 Register ส่วนประกอบของ ChartJS
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

  // ป้องกันปัญหา Hydration ของ Next.js
  useEffect(() => { 
    setMounted(true); 
  }, []);

  const chartData = useMemo(() => {
    // ถ้ายังไม่ Mounted หรือไม่มีข้อมูล/อุปกรณ์ ไม่ต้องวาด
    if (!mounted || !data || data.length === 0 || !devices.length) {
        return { labels: [], datasets: [] };
    }

    // 🌟 1. สร้าง Labels แกน X (เวลา)
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

    const datasets: any[] = [];
    const nodeColors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

    // 🌟 2. วนลูปสร้างเส้นกราฟตามอุปกรณ์
    devices.forEach((dev: any, idx: number) => {
      // ถ้าเลือกเฉพาะอุปกรณ์ และไม่ใช่ตัวนี้ ให้ข้ามไป
      if (selectedDeviceMac !== 'ALL' && dev.mac !== selectedDeviceMac) return;

      // 🔍 ดักจับข้อมูล: รองรับทั้ง .mac และ .device_id
      const deviceLogs = data.filter((l: any) => (l.mac || l.device_id) === dev.mac);
      const mainColor = nodeColors[idx % nodeColors.length];

      if (deviceLogs.length === 0) return; // ไม่มี Log ของเครื่องนี้ไม่ต้องวาดเส้น

      // --- ชุดข้อมูลระดับน้ำ ---
      if (viewMode === 'ALL_METRICS' || viewMode === 'LEVEL') {
        datasets.push({
          label: `🌊 ${dev.name} - น้ำ (cm)`,
          data: labels.map((_, index) => {
            const log = deviceLogs[Math.floor((index / labels.length) * deviceLogs.length)];
            const raw = Number(log?.level || 84.0);
            let val = (84.0 - raw) - 5.0; 
            if (raw <= 0.5 || raw > 90) val = 0;
            return val < 0 ? 0 : (val > 40 ? 40 : val);
          }),
          borderColor: mainColor,
          backgroundColor: mainColor + '15',
          fill: viewMode === 'LEVEL',
          yAxisID: 'y',
          tension: 0.4,
          spanGaps: true
        });
      }

      // --- ชุดข้อมูลอุณหภูมิ ---
      if (viewMode === 'ALL_METRICS' || viewMode === 'TEMP') {
        datasets.push({
          label: `🌡️ ${dev.name} - Temp (°C)`,
          data: labels.map((_, index) => {
            const log = deviceLogs[Math.floor((index / labels.length) * deviceLogs.length)];
            return Number(log?.temperature) || null;
          }),
          borderColor: '#f97316',
          yAxisID: 'y1',
          borderDash: viewMode === 'ALL_METRICS' ? [5, 5] : [],
          tension: 0.4,
          spanGaps: true
        });
      }

      // --- ชุดข้อมูลความชื้น ---
      if (viewMode === 'ALL_METRICS' || viewMode === 'HUMIDITY') {
        datasets.push({
          label: `💧 ${dev.name} - Humid (%)`,
          data: labels.map((_, index) => {
            const log = deviceLogs[Math.floor((index / labels.length) * deviceLogs.length)];
            return Number(log?.air_humidity || log?.humidity) || null;
          }),
          borderColor: '#06b6d4',
          yAxisID: 'y2',
          borderDash: viewMode === 'ALL_METRICS' ? [2, 2] : [],
          tension: 0.4,
          spanGaps: true
        });
      }
    });

    return { labels, datasets };
  }, [data, timeframe, viewMode, selectedDeviceMac, mounted, devices]);

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1000 },
    plugins: {
      legend: { 
        display: true, 
        position: 'top' as const, 
        labels: { 
          color: isDark ? '#cbd5e1' : '#475569', 
          font: { size: 10, weight: '600' },
          usePointStyle: true,
          pointStyle: 'circle'
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
      }
    },
    scales: {
      x: { 
        ticks: { color: isDark ? '#64748b' : '#94a3b8', font: { size: 10 } }, 
        grid: { display: false } 
      },
      y: { 
        display: viewMode !== 'TEMP' && viewMode !== 'HUMIDITY', 
        position: 'left' as const, 
        min: 0, 
        max: 45, 
        ticks: { color: '#3b82f6', font: { weight: 'bold' } },
        grid: { color: isDark ? '#1e293b' : '#f1f5f9' }
      },
      y1: { 
        display: viewMode === 'ALL_METRICS' || viewMode === 'TEMP', 
        position: 'right' as const, 
        min: 10, 
        max: 50, 
        ticks: { color: '#f97316' }, 
        grid: { display: false } 
      },
      y2: { 
        display: viewMode === 'ALL_METRICS' || viewMode === 'HUMIDITY', 
        position: 'right' as const, 
        min: 0, 
        max: 100, 
        ticks: { color: '#06b6d4' }, 
        grid: { display: false } 
      }
    }
  };

  // 🌟 ถ้ายังไม่พร้อม หรือข้อมูลยังไม่มา ให้โชว์ Loading สวยๆ แทนการหายไปเฉยๆ
  if (!mounted || !data || data.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 min-h-[350px]">
        <Activity className="animate-pulse mb-2" size={40} />
        <p className="text-[10px] font-black uppercase tracking-widest">Waiting for data signal...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col p-1 animate-in fade-in duration-700">
      <div className="flex flex-wrap gap-2 mb-6">
        <TabButton active={viewMode === 'ALL_METRICS'} onClick={() => setViewMode('ALL_METRICS')} label="📊 ทั้งหมด" color="blue" />
        <TabButton active={viewMode === 'LEVEL'} onClick={() => setViewMode('LEVEL')} label="🌊 ระดับน้ำ" color="blue" />
        <TabButton active={viewMode === 'TEMP'} onClick={() => setViewMode('TEMP')} label="🌡️ อุณหภูมิ" color="orange" />
        <TabButton active={viewMode === 'HUMIDITY'} onClick={() => setViewMode('HUMIDITY')} label="💧 ความชื้น" color="cyan" />
      </div>
      <div className="flex-grow min-h-[350px]">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}

// Sub-component สำหรับปุ่มเปลี่ยนโหมด
function TabButton({ active, onClick, label, color }: any) {
    const colorClasses: any = {
        blue: active ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
        orange: active ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
        cyan: active ? 'bg-cyan-600 text-white' : 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400',
    };

    return (
        <button 
            onClick={onClick} 
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm hover:scale-105 active:scale-95 ${colorClasses[color]}`}
        >
            {label}
        </button>
    );
}