'use client';

import React, { useEffect, useState } from 'react';
import { 
  Users, Shield, Settings, Power, BellRing, Trash2, 
  ChevronLeft, Save, Radio, UserCog, Database
} from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ดึงข้อมูลอุปกรณ์
  const fetchDevices = async () => {
    try {
      const res = await fetch('/api/devices');
      if (res.ok) setDevices(await res.json());
      setLoading(false);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchDevices(); }, []);

  // ฟังก์ชันอัปเดตการตั้งค่า (รวมถึง Role)
  const updateDevice = async (mac: string, data: any) => {
    try {
      await fetch(`/api/devices/${mac}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      fetchDevices(); // รีโหลดข้อมูล
    } catch (err) { console.error(err); }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 sm:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-500 transition-all">
              <ChevronLeft size={24}/>
            </Link>
            <div>
              <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">System Control Panel</h1>
              <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Manage Nodes & User Roles</p>
            </div>
          </div>
          <button onClick={fetchDevices} className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all">
            <Database size={20}/>
          </button>
        </div>

        {/* Device Table */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2">
            <Users size={20} className="text-blue-500"/>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Active Nodes Management</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 dark:bg-slate-900/80">
                <tr>
                  <th className="px-6 py-4">Device Node</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Buzzer</th>
                  <th className="px-6 py-4">System Role</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {devices.map((dev) => (
                  <tr key={dev.mac} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400"><Radio size={18}/></div>
                        <div>
                          <div className="font-black text-slate-800 dark:text-white text-sm">{dev.name}</div>
                          <div className="text-[10px] font-mono text-slate-400 uppercase">{dev.mac}</div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6">
                      <button 
                        onClick={() => updateDevice(dev.mac, { isActive: !dev.isActive })}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${dev.isActive ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}
                      >
                        <Power size={14}/> {dev.isActive ? 'ACTIVE' : 'OFFLINE'}
                      </button>
                    </td>

                    <td className="px-6">
                      <button 
                        onClick={() => updateDevice(dev.mac, { isBuzzerEnabled: !dev.isBuzzerEnabled })}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${dev.isBuzzerEnabled ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/20' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}
                      >
                        <BellRing size={14}/> {dev.isBuzzerEnabled ? 'ENABLED' : 'MUTED'}
                      </button>
                    </td>

                    <td className="px-6">
                      <div className="relative">
                        <select 
                          value={dev.role || 'user'} 
                          onChange={(e) => updateDevice(dev.mac, { role: e.target.value })}
                          className="appearance-none bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-[11px] font-black text-slate-700 dark:text-white pr-8 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="admin">ADMIN</option>
                          <option value="user">USER</option>
                          <option value="viewer">VIEWER</option>
                        </select>
                        <UserCog size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </td>

                    <td className="px-6">
                      <button className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Global Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl">
              <h3 className="font-black uppercase tracking-widest text-sm mb-4 flex items-center gap-2"><Shield className="text-blue-500" size={18}/> Access Security</h3>
              <p className="text-xs text-slate-500 font-bold mb-6">Configure who can access this dashboard and their permission levels across the network.</p>
              <button className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white rounded-2xl font-black text-xs uppercase hover:bg-slate-200 transition-all">Update Security Policy</button>
           </div>
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl">
              <h3 className="font-black uppercase tracking-widest text-sm mb-4 flex items-center gap-2"><Settings className="text-orange-500" size={18}/> Advanced Settings</h3>
              <p className="text-xs text-slate-500 font-bold mb-6">Manage global thresholds, API keys, and external service integrations (LINE, Webhooks).</p>
              <button className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-all">Open Advanced Tools</button>
           </div>
        </div>

      </div>
    </div>
  );
}