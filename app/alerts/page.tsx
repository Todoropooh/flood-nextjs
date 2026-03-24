'use client';

import React, { useState } from 'react';
import { ShieldAlert, Bell, MessageSquare, Mail, Save, Plus, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AlertsPage() {
  const [lineEnabled, setLineEnabled] = useState(true);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1121] font-sans p-6 transition-colors duration-300">
      <div className="max-w-[900px] mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Notification Center</h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Alert Settings & Channels</p>
          </div>
        </div>

        {/* Line Notify Config (UX: เข้าใจง่ายแบ่งหมวดชัดเจน) */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl">
                  <MessageSquare size={24} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 dark:text-white">LINE Notify</h3>
                  <p className="text-xs font-medium text-slate-500">แจ้งเตือนผ่านกลุ่ม Line ทันทีที่น้ำถึงระดับวิกฤต</p>
                </div>
              </div>
              <button 
                onClick={() => setLineEnabled(!lineEnabled)}
                className={`w-14 h-8 rounded-full transition-all relative ${lineEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-all ${lineEnabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-50 dark:border-slate-800">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">LINE Token</label>
                <input 
                  type="password" 
                  placeholder="Paste your Line Token here..."
                  className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <button className="text-xs font-black text-emerald-500 uppercase tracking-widest hover:underline">Test Connection</button>
            </div>
          </div>
        </div>

        {/* Alert Levels (UX: ปรับแต่งได้ตามจริง) */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm p-8 space-y-6">
          <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
            <ShieldAlert size={20} className="text-red-500" /> Alert Thresholds
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-900/20">
              <AlertTriangle className="text-orange-500" />
              <div className="flex-1">
                <p className="text-xs font-black text-orange-600 uppercase">Warning Level</p>
                <p className="text-[10px] font-medium text-orange-500">แจ้งเตือนเมื่อน้ำถึงระดับเฝ้าระวัง</p>
              </div>
              <input type="number" defaultValue={2.8} className="w-20 bg-white dark:bg-slate-800 border-none rounded-lg p-2 text-center font-bold text-sm" />
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20">
              <ShieldAlert className="text-red-500" />
              <div className="flex-1">
                <p className="text-xs font-black text-red-600 uppercase">Critical Level</p>
                <p className="text-[10px] font-medium text-red-500">แจ้งเตือนเมื่อน้ำถึงระดับอันตราย</p>
              </div>
              <input type="number" defaultValue={3.0} className="w-20 bg-white dark:bg-slate-800 border-none rounded-lg p-2 text-center font-bold text-sm" />
            </div>
          </div>
        </div>

        <button className="w-full bg-[#1155FA] hover:bg-[#0A3DCD] text-white py-4 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-2">
          <Save size={20} /> Save Configuration
        </button>

      </div>
    </div>
  );
}