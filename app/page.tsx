'use client';
import { useState, useEffect } from 'react';
import { Waves, Thermometer, Droplets, Activity, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function Home() {
  const [history, setHistory] = useState<any[]>([]);
  const [latest, setLatest] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/flood?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setHistory(data);
          if (data.length > 0) setLatest(data[data.length - 1]);
        }
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return <div className="min-h-screen bg-slate-50" />;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black text-blue-600 uppercase italic">Flood <span className="text-slate-900">Monitor</span></h1>
          <p className="text-slate-500 text-xs tracking-widest uppercase">
            Last Update: {latest?.createdAt ? new Date(latest.createdAt).toLocaleString('th-TH') : 'Waiting...'}
          </p>
        </div>
        <button onClick={fetchData} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-all">
          <RefreshCw size={20} className="text-blue-600" />
        </button>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {/* ระดับน้ำ */}
        <Card label="Max Level" val={Number(latest?.level || 0).toFixed(1)} unit="cm" icon={<Waves/>} color="text-blue-600" />
        {/* อุณหภูมิ */}
        <Card label="Temperature" val={Number(latest?.temperature || 0).toFixed(1)} unit="°C" icon={<Thermometer/>} color="text-orange-500" />
        {/* ความชื้น */}
        <Card label="Humidity" val={Number(latest?.air_humidity || 0).toFixed(0)} unit="%" icon={<Droplets/>} color="text-emerald-500" />
        {/* สถานะ */}
        <Card label="Status" val={latest?.level >= 7 ? "CRITICAL" : "NORMAL"} unit="" icon={<Activity/>} color={latest?.level >= 7 ? "text-red-500" : "text-emerald-500"} />
      </div>

      <div className="max-w-7xl mx-auto bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <h2 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-2">
          <Activity size={18} className="text-blue-600"/> Analytics Trend
        </h2>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
              <XAxis dataKey="createdAt" tick={false} />
              <YAxis />
              <Tooltip contentStyle={{borderRadius: '15px', border:'none', boxShadow:'0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
              <Legend />
              <Line type="monotone" dataKey="level" name="Level (cm)" stroke="#2563eb" strokeWidth={4} dot={false} />
              <Line type="monotone" dataKey="temperature" name="Temp (°C)" stroke="#f97316" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="air_humidity" name="Humid (%)" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Card({ label, val, unit, icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-40">
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
        <div className={`p-2 rounded-xl bg-slate-50 ${color}`}>{icon}</div>
      </div>
      <div>
        <span className={`text-4xl font-black ${color}`}>{val}</span>
        <span className="text-xs font-bold text-slate-400 ml-1">{unit}</span>
      </div>
    </div>
  );
}