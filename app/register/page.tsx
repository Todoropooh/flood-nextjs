'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Waves, Loader2, UserPlus, ArrowLeft, Check, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  const [formData, setFormData] = useState({ 
    username: '', 
    password: '', 
    firstname: '', 
    lastname: '',
    phone: '' 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...formData, 
          isApproved: false, // 🌟 ส่งไปเป็น false เพื่อให้ Admin กดยืนยันก่อน
          role: 'user' 
        })
      });

      if (res.ok) {
        alert("สมัครสมาชิกสำเร็จ! กรุณารอผู้ดูแลระบบ (Admin) อนุมัติการใช้งาน");
        router.push('/'); // สมัครเสร็จส่งกลับไปหน้า Login
      } else {
        const data = await res.json();
        setError(data.error || "เกิดข้อผิดพลาดในการสมัคร");
      }
    } catch (err) {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#020617] p-4 transition-colors duration-500">
      <div className="w-full max-w-[450px] bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 dark:border-slate-800 relative overflow-hidden">
        
        {/* หัวข้อ */}
        <div className="flex flex-col items-center mb-10">
          <div className="p-4 bg-[#1155FA] rounded-[1.5rem] text-white shadow-lg shadow-blue-500/30 mb-5 animate-bounce-slow">
            <Waves size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Create Account</h1>
          <p className="text-[11px] text-slate-400 font-bold mt-2 uppercase tracking-widest text-center px-4">
            ลงทะเบียนเข้าใช้งานระบบเฝ้าระวังน้ำท่วม
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-xs font-bold">
            <ShieldAlert size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Identify</label>
            <input required placeholder="Username" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 outline-none font-bold text-sm focus:border-blue-500 transition-all dark:text-white" 
              onChange={e => setFormData({...formData, username: e.target.value})} />
            <input required type="password" placeholder="Password" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 outline-none font-bold text-sm focus:border-blue-500 transition-all dark:text-white" 
              onChange={e => setFormData({...formData, password: e.target.value})} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Personal Info</label>
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="Firstname" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 outline-none font-bold text-sm focus:border-blue-500 transition-all dark:text-white" 
                onChange={e => setFormData({...formData, firstname: e.target.value})} />
              <input required placeholder="Lastname" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 outline-none font-bold text-sm focus:border-blue-500 transition-all dark:text-white" 
                onChange={e => setFormData({...formData, lastname: e.target.value})} />
            </div>
            <input placeholder="Phone Number" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 outline-none font-bold text-sm focus:border-blue-500 transition-all dark:text-white" 
                onChange={e => setFormData({...formData, phone: e.target.value})} />
          </div>

          <button disabled={loading} className="w-full py-5 bg-[#1155FA] hover:bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-blue-500/25 active:scale-95 transition-all flex justify-center items-center gap-3">
            {loading ? <Loader2 className="animate-spin" /> : <><UserPlus size={18}/> Register Now</>}
          </button>
        </form>

        <Link href="/" className="flex items-center justify-center gap-2 mt-8 text-[10px] font-black text-slate-400 uppercase hover:text-blue-600 transition-colors tracking-widest">
          <ArrowLeft size={14}/> Back to Sign In
        </Link>
      </div>
    </div>
  );
}