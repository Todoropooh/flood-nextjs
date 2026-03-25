'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react'; 
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Waves, Lock, User, AlertCircle, ArrowRight, Sun, Moon } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  const { setTheme, resolvedTheme } = useTheme();
  const router = useRouter();
  
  // ดึงสถานะการล็อกอินปัจจุบันมาเช็ค
  const { status } = useSession(); 

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ถ้าผู้ใช้ล็อกอินอยู่แล้ว ให้เด้งไปหน้า Dashboard อัตโนมัติ
  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/');
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const res = await signIn('credentials', {
      username,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError('Username หรือ Password ไม่ถูกต้อง กรุณาลองใหม่');
      setIsLoading(false);
    } else {
      router.push('/'); 
      router.refresh(); 
    }
  };

  // รอให้โหลด Theme เสร็จ และถ้ากำลังเช็คสถานะล็อกอินอยู่ให้แสดงจอดำๆ/ใสๆ รอไว้ก่อน
  if (!isMounted || status === 'loading') return null;

  return (
    <main className="min-h-screen flex items-center justify-center relative font-sans overflow-hidden">
      
      {/* 🌌 Background */}
      <div className="fixed inset-0 -z-10 bg-[#0f172a]">
        <img 
          src="https://images.pexels.com/photos/1295138/pexels-photo-1295138.jpeg" 
          className="w-full h-full object-cover opacity-100"
          alt="background"
        />
        <div className="absolute inset-0 bg-slate-100/30 dark:bg-black/70 backdrop-blur-[20px] transition-colors duration-500" />
      </div>

      {/* 🌗 Theme Toggle */}
      <div className="absolute top-6 right-6 z-50">
        <div className="flex items-center bg-white/40 dark:bg-black/40 p-1 rounded-full backdrop-blur-md border border-white/50 dark:border-white/10 shadow-sm">
          <button onClick={() => setTheme('light')} className={`p-2 rounded-full transition-all duration-300 ${resolvedTheme === 'light' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-white/40'}`}><Sun size={14}/></button>
          <button onClick={() => setTheme('dark')} className={`p-2 rounded-full transition-all duration-300 ${resolvedTheme === 'dark' ? 'bg-[#1C1C1E] text-blue-400 shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-black/40'}`}><Moon size={14}/></button>
        </div>
      </div>

      <div className="w-full max-w-md relative z-10 px-4">
        
        {/* 🌟 Glassmorphism Login Card */}
        <div className="bg-white/60 dark:bg-[#1C1C1E]/60 rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-white/10 backdrop-blur-xl overflow-hidden transform transition-all">
          
          {/* Header - ปรับข้อความต้อนรับ */}
          <div className="p-8 pb-6 text-center">
            <div className="flex justify-center mb-5">
              <div className="p-4 bg-blue-600/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/20">
                <Waves size={36} className="text-white animate-pulse" />
              </div>
            </div>
            <h1 className="text-2xl font-black uppercase tracking-widest text-slate-800 dark:text-white drop-shadow-sm">
              Welcome <span className="text-blue-600 dark:text-blue-500">Back</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-3 drop-shadow-sm leading-relaxed">
              Real-time Flood Monitoring <br/> & Early Warning System
            </p>
          </div>

          {/* Form */}
          <div className="p-8 pt-0">
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wide animate-in fade-in slide-in-from-top-2 backdrop-blur-md">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Username Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 tracking-widest ml-1 drop-shadow-sm">Username</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-black/40 border border-white/50 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all backdrop-blur-md placeholder:text-slate-400/70 shadow-inner"
                    placeholder="Enter your username"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 tracking-widest ml-1 drop-shadow-sm">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-black/40 border border-white/50 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all backdrop-blur-md placeholder:text-slate-400/70 shadow-inner"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-4 py-4 bg-blue-600/90 hover:bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/30 active:scale-95 flex justify-center items-center gap-2 disabled:opacity-70 backdrop-blur-md border border-white/20"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>Secure Login <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-white/30 dark:border-white/10 text-center">
              <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest drop-shadow-sm">
                Don't have an account?{' '}
                <Link href="/register" className="text-blue-600 dark:text-blue-400 font-black hover:text-blue-700 dark:hover:text-blue-300 transition-all ml-1">
                  Request Access
                </Link>
              </p>
            </div>
            
          </div>
        </div>

      </div>
    </main>
  );
}