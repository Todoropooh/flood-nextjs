'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
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

  // ป้องกัน Hydration Mismatch ของ next-themes
  useEffect(() => {
    setIsMounted(true);
  }, []);

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
      router.push('/admin'); 
      router.refresh(); 
    }
  };

  if (!isMounted) return null;

  return (
    <main className="min-h-screen flex items-center justify-center relative font-sans overflow-hidden">
      
      {/* 🌌 Background (ซิงค์กับหน้า Dashboard) */}
      <div className="fixed inset-0 -z-10 bg-[#0f172a]">
        <img 
          src="https://images.pexels.com/photos/1295138/pexels-photo-1295138.jpeg" 
          className="w-full h-full object-cover opacity-100"
          alt="background"
        />
        <div className="absolute inset-0 bg-white/20 dark:bg-black/70 backdrop-blur-2xl transition-colors duration-500" />
      </div>

      {/* 🌗 Theme Toggle (มุมขวาบน) */}
      <div className="absolute top-6 right-6 z-50">
        <div className="flex items-center bg-black/10 dark:bg-white/10 p-1 rounded-full backdrop-blur-md border border-white/20 dark:border-white/5">
          <button onClick={() => setTheme('light')} className={`p-1.5 rounded-full transition-all duration-300 ${resolvedTheme === 'light' ? 'bg-white text-blue-500 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}><Sun size={12}/></button>
          <button onClick={() => setTheme('dark')} className={`p-1.5 rounded-full transition-all duration-300 ${resolvedTheme === 'dark' ? 'bg-[#2C2C2E] text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}><Moon size={12}/></button>
        </div>
      </div>

      <div className="w-full max-w-md relative z-10 px-4">
        
        {/* 🌟 Glassmorphism Login Card */}
        <div className="bg-white/60 dark:bg-[#1C1C1E]/60 rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-white/10 backdrop-blur-xl overflow-hidden transform transition-all">
          
          {/* Header */}
          <div className="p-8 pb-4 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-blue-600 rounded-3xl shadow-lg shadow-blue-500/30">
                <Waves size={32} className="text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-black uppercase tracking-widest text-slate-800 dark:text-white">
              Admin <span className="text-blue-600 dark:text-blue-500">Portal</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">
              System Authentication
            </p>
          </div>

          {/* Form */}
          <div className="p-8 pt-4">
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wide animate-in fade-in slide-in-from-top-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Username Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest ml-1">Username</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-white/50 dark:bg-black/20 border border-white/50 dark:border-white/10 rounded-2xl text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all backdrop-blur-sm placeholder:text-slate-400/70"
                    placeholder="Enter admin username"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest ml-1">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-white/50 dark:bg-black/20 border border-white/50 dark:border-white/10 rounded-2xl text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all backdrop-blur-sm placeholder:text-slate-400/70"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/30 active:scale-95 flex justify-center items-center gap-2 disabled:opacity-70"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>Authenticate <ArrowRight size={16} /></>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* 🔙 กลับหน้าหลัก */}
        <div className="mt-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 dark:bg-black/20 border border-white/30 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-black/40 transition-all backdrop-blur-md">
            ← Return to Dashboard
          </Link>
        </div>

      </div>
    </main>
  );
}