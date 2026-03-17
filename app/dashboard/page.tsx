'use client';
import { useState, useEffect } from 'react';
import { Waves, Thermometer, Droplets, Activity, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function UserDashboard() {
  const [history, setHistory] = useState<any[]>([]);
  const [latest, setLatest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = async () => {
    try {
      // 🚨 เปลี่ยนมาดึงที่ /api/flood ที่เราเพิ่งแก้ไปด้านบน
      const res = await fetch(`/api/flood?timeframe=day&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
           setHistory(data);
           if (data.length > 0) {
             setLatest(data[data.length - 1]);
           }
        }
      } else {
        setError(`Failed: ${res.status}`);
      }
    } catch (err: any) { 
      setError(err.message);
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); 
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return <div className="h-screen bg-[#0f172a]" />;
  if (loading && history.length === 0) return <div className="h-screen flex items-center justify-center bg-[#0f172a] text-white">Connecting...</div>;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-4 md:p-8 font-sans">
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black uppercase italic text-blue-500">Monitoring <span className="text-white">Live</span></h1>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest">
            Last Update: {latest?.createdAt ? new Date(latest.createdAt).toLocaleString('th-TH') : 'Waiting...'}
          </p>
        </div>
        <button onClick={fetchData} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 border border-white/10">
          <RefreshCw size={20} className="text-blue-400" />
        </button>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          {/* Water Level */}
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-900/40 p-6 rounded-[2.5rem] border border-blue-500/30">
            <div className="flex justify-between items-center mb-4"><Waves className="text-blue-400" size={24} /></div>
            <div className="text-5xl font-black">{Number(latest?.level || 0).toFixed(1)}<span className="text-sm font-normal text-blue-300 ml-2">cm</span></div>
          </div>
          {/* Temp */}
          <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10">
            <div className="flex justify-between items-center mb-4"><Thermometer className="text-orange-400" size={24} /></div>
            <div className="text-4xl font-black">{Number(latest?.temperature || 0).toFixed(1)}<span className="text-sm font-normal text-slate-500 ml-2">°C</span></div>
          </div>
          {/* Humidity */}
          <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10">
            <div className="flex justify-between items-center mb-4"><Droplets className="text-emerald-400" size={24} /></div>
            <div className="text-4xl font-black">{Number(latest?.air_humidity || 0).toFixed(1)}<span className="text-sm font-normal text-slate-500 ml-2">%</span></div>
          </div>
        </div>

        <div className="lg:col-span-3 bg-white/5 border border-white/10 rounded-[3rem] p-8 backdrop-blur-xl shadow-lg">
          <div className="flex items-center gap-3 mb-8">
            <Activity className="text-blue-500" size={20} />
            <h2 className="text-sm font-black uppercase tracking-widest">Flood Analytics Trend</h2>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="createdAt" tick={false} stroke="#ffffff30" />
                <YAxis stroke="#ffffff30" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '15px' }} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" dataKey="level" name="Level (cm)" stroke="#3b82f6" strokeWidth={4} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="temperature" name="Temp (°C)" stroke="#f97316" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="air_humidity" name="Humid (%)" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}