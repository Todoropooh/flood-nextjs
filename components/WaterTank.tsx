'use client';

import { useEffect, useState } from 'react';
import WaterLevelChart from '@/components/WaterLevelChart';
import DashboardCard from '@/components/DashboardCard';
// import StatusDonut from '@/components/StatusDonut'; // <-- เราเอา Donut ออกก่อน เพื่อให้หน้าจอไม่รกเกินไป
import WaterTank from '@/components/WaterTank'; // <-- นำแทงค์กลับมา
import DataTable from '@/components/DataTable'; // <-- นำตารางเข้ามา
import { RefreshCw, Droplets, Thermometer, Activity, Waves, LayoutDashboard } from 'lucide-react';

export default function Home() {
  const [logs, setLogs] = useState<any[]>([]);
  const [simParams, setSimParams] = useState({ temp: 28.5, humidity: 65 });

  const fetchData = async () => {
    try {
      const res = await fetch('/api/flood');
      const data = await res.json();
      setLogs(data);
      // จำลองค่า Temp/Humid
      setSimParams(prev => ({
        temp: +(prev.temp + (Math.random() * 0.4 - 0.2)).toFixed(1),
        humidity: Math.floor(prev.humidity + (Math.random() * 2 - 1))
      }));
    } catch (error) { console.error('Error:', error); }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const lastLog = logs.length > 0 ? logs[logs.length - 1] : { level: 0, status: 'Normal' };

  return (
    <main className="min-h-screen bg-slate-100/80 text-slate-800 font-sans p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* 1. HEADER: ปรับให้ดูมีมิติขึ้น */}
        <header className="flex flex-col md:flex-row justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-slate-200/60">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl shadow-inner">
              <LayoutDashboard className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Smart Flood Monitor
              </h1>
              <p className="text-slate-500 text-sm flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-500"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live System Active
              </p>
            </div>
          </div>
          <button onClick={fetchData} className="mt-4 md:mt-0 flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 transition-all active:scale-95">
            <RefreshCw size={16} className="text-slate-400" /> Refresh View
          </button>
        </header>

        {/* 2. HERO SECTION: กราฟ + แทงค์น้ำ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Card (กว้าง 2 ส่วน) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                 <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                   <Waves className="text-blue-500" size={20}/> Water Level Trend
                 </h2>
                 <p className="text-sm text-slate-400">Real-time historical data</p>
              </div>
            </div>
            <div className="flex-1 w-full min-h-[250px]">
              <WaterLevelChart data={logs} />
            </div>
          </div>

          {/* Tank Visual (กว้าง 1 ส่วน) */}
          <WaterTank level={lastLog.level} />
        </div>

        {/* 3. METRICS GRID: การ์ดข้อมูล 4 ใบ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardCard title="Current Level" value={lastLog.level} unit="cm" trend={lastLog.level > 50 ? "Rising" : "Stable"} icon={<Waves className="text-blue-500" />} color="text-blue-600" />
          <DashboardCard title="Safety Status" value={lastLog.status} color={lastLog.status === 'Critical' ? 'text-red-600' : lastLog.status === 'Warning' ? 'text-amber-600' : 'text-emerald-600'} icon={<Activity className="text-slate-400" />} />
          <DashboardCard title="Avg. Humidity" value={simParams.humidity} unit="%" icon={<Droplets className="text-cyan-500" />} />
          <DashboardCard title="Temperature" value={simParams.temp} unit="°C" icon={<Thermometer className="text-orange-500" />} />
        </div>

        {/* 4. DATA TABLE: ตารางด้านล่างสุด */}
        <DataTable logs={logs} />

      </div>
    </main>
  );
}