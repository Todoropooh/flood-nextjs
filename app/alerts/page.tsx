'use client';

import React, { useState } from 'react';
import { ShieldAlert, Bell, MessageSquare, Save, ArrowLeft, AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function AlertsPage() {
  const [lineToken, setLineToken] = useState(""); // 🌟 ตัวจำค่า Token ที่พี่จะเอามาวาง
  const [isTesting, setIsTesting] = useState(false);

  // 🚀 ฟังก์ชันทดสอบส่ง LINE ทันที
  const handleTestConnection = async () => {
    if (!lineToken) return alert("กรุณาวาง ACCESS_TOKEN ก่อนทดสอบครับพี่!");
    
    setIsTesting(true);
    try {
      const res = await fetch('/api/test-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: lineToken, message: "🔔 ทดสอบระบบ: การเชื่อมต่อสำเร็จแล้วครับ!" })
      });
      const data = await res.json();
      if (data.success) alert("✅ ข้อความเด้งเข้า LINE แล้วครับ!");
      else alert("❌ พังครับ: " + data.error);
    } catch (e) {
      alert("❌ เชื่อมต่อ Server ไม่ได้");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1121] p-6">
      <div className="max-w-[900px] mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-black">Notification Center</h1>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl"><MessageSquare size={24} /></div>
            <div>
              <h3 className="font-black">LINE Notify (Messaging API)</h3>
              <p className="text-xs text-slate-500">วาง Channel Access Token เพื่อเปิดใช้งาน</p>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Channel Access Token</label>
              <input 
                type="text" 
                value={lineToken}
                onChange={(e) => setLineToken(e.target.value)} // 🌟 พิมพ์แล้วจำค่า
                placeholder="วาง ACCESS_TOKEN ยาวๆ ที่นี่..."
                className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            
            {/* 🌟 ปุ่มทดสอบที่ใช้งานได้จริง */}
            <button 
              onClick={handleTestConnection}
              disabled={isTesting}
              className="text-xs font-black text-emerald-500 uppercase tracking-widest hover:underline flex items-center gap-2"
            >
              {isTesting ? <Loader2 className="animate-spin" size={14}/> : null}
              {isTesting ? "กำลังทดสอบ..." : "Test Connection"}
            </button>
          </div>
        </div>

        <button className="w-full bg-[#1155FA] text-white py-4 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
          <Save size={20} className="inline mr-2" /> Save Configuration
        </button>
      </div>
    </div>
  );
}