'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Waves, Loader2, Check, Eye, EyeOff, UserPlus } from 'lucide-react';
import Link from 'next/link'; // 🌟 อย่าลืม Import Link

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setLoginError("");

    try {
      const res = await signIn("credentials", {
        redirect: false,
        username,
        password,
      });

      if (res?.error) {
        setLoginError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      }
    } catch (err) {
      setLoginError("ระบบมีปัญหา โปรดลองอีกครั้ง");
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    // 🌟 1. Main Container
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 font-sans transition-all duration-300 relative overflow-hidden bg-slate-50 dark:bg-slate-950">
      
      {/* 🌟 2. Background Layer */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0 blur-md scale-105 pointer-events-none transition-all"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1547683905-f686c993aae5?q=80&w=1974&auto=format&fit=crop')" }}
      >
        <div className="absolute inset-0 bg-slate-900/30 dark:bg-black/60 transition-colors"></div>
      </div>

      {/* 🌟 3. Front Card Container */}
      <div className="w-full max-w-5xl bg-white/95 dark:bg-slate-900/90 backdrop-blur-sm rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] flex flex-col md:flex-row overflow-hidden relative z-10 border border-transparent dark:border-slate-800 transition-all">

        {/* 🌊 ด้านซ้าย: Branding */}
        <div className="relative w-full md:w-5/12 bg-gradient-to-b from-[#1155FA] to-[#0A3DCD] dark:from-[#1d4ed8] dark:to-[#1e3a8a] text-white flex flex-col items-center justify-center px-10 py-16 md:py-24 md:pr-24 min-h-[350px] md:min-h-[600px] z-10">
          
          <div className="relative z-20 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-white dark:bg-slate-100 rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.12)] mb-6 transform transition-transform hover:scale-105">
              <Waves size={48} className="text-[#1155FA]" />
            </div>
            
            <h2 className="text-xl font-bold mb-1 opacity-90 select-none">Welcome to</h2>
            <h1 className="text-4xl font-black mb-6 tracking-tight select-none">Flood Monitor</h1>
            
            <p className="text-[11px] font-medium text-blue-100/80 max-w-[250px] leading-relaxed select-none">
              ระบบเฝ้าระวังและแจ้งเตือนระดับน้ำอัจฉริยะแบบเรียลไทม์ ป้องกันภัยพิบัติก่อนเกิดเหตุ ตลอด 24 ชั่วโมง
            </p>

            <div className="absolute bottom-[-30px] md:bottom-[-80px] flex items-center gap-4 text-[10px] font-bold tracking-widest text-blue-200/50 uppercase select-none">
              <span>Smart IoT</span>
              <div className="w-1 h-1 rounded-full bg-blue-200/50" />
              <span>Security</span>
            </div>
          </div>

          {/* SVG Wave Decorations */}
          <div className="hidden md:block absolute top-0 right-[-1px] h-full w-[120px] z-0 pointer-events-none">
            <svg viewBox="0 0 100 800" preserveAspectRatio="none" className="w-full h-full text-white/95 dark:text-slate-900/90 fill-current transition-colors">
              <path d="M100,0 C30,150 120,300 40,500 C-20,700 80,800 100,800 Z" fillOpacity="0.2" />
              <path d="M100,0 C70,200 150,450 20,650 C-20,750 70,800 100,800 Z" />
            </svg>
          </div>
        </div>

        {/* 📝 ด้านขวา: Login Form */}
        <div className="w-full md:w-7/12 p-10 sm:p-16 md:p-20 md:pl-28 flex flex-col justify-center relative z-20">
          
          <h3 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white mb-10 text-center md:text-left select-none">
            Login to your account
          </h3>

          <form onSubmit={handleLogin} className="space-y-8 max-w-sm mx-auto md:mx-0 w-full">
            
            <div className="space-y-2 relative group">
              <label className="text-[13px] font-bold text-slate-800 dark:text-slate-300 select-none">Username</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter your username"
                  className="w-full pb-3 pt-1 border-b-2 border-slate-200 dark:border-slate-700 outline-none focus:border-[#1155FA] dark:focus:border-blue-500 transition-colors text-slate-700 dark:text-slate-100 font-medium placeholder:text-slate-400 dark:placeholder:text-slate-600 placeholder:font-normal bg-transparent"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <div className="absolute right-0 top-2 text-[#1155FA]/30 group-focus-within:text-[#1155FA] transition-colors pointer-events-none">
                  <Check size={18} />
                </div>
              </div>
            </div>

            <div className="space-y-2 relative group">
              <label className="text-[13px] font-bold text-slate-800 dark:text-slate-300 select-none">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="w-full pb-3 pt-1 pr-10 border-b-2 border-slate-200 dark:border-slate-700 outline-none focus:border-[#1155FA] dark:focus:border-blue-500 transition-colors text-slate-700 dark:text-slate-100 font-medium placeholder:text-slate-400 dark:placeholder:text-slate-600 placeholder:font-normal bg-transparent"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setLoginError("");
                  }}
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-0 top-2 text-slate-400 dark:text-slate-500 hover:text-[#1155FA] dark:hover:text-blue-400 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {loginError && (
              <p className="text-red-500 dark:text-red-400 text-xs font-bold animate-pulse">
                {loginError}
              </p>
            )}

            <div className="pt-4 flex flex-col sm:flex-row items-center gap-6">
              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full sm:w-auto bg-[#1155FA] dark:bg-blue-600 hover:bg-[#0A3DCD] dark:hover:bg-blue-500 disabled:bg-blue-300 dark:disabled:bg-blue-900 text-white rounded-full px-10 py-3.5 font-bold shadow-[0_8px_20px_rgba(17,85,250,0.3)] hover:shadow-[0_8px_25px_rgba(17,85,250,0.4)] transition-all flex items-center justify-center min-w-[160px] active:scale-95"
              >
                {isAuthenticating ? <Loader2 className="animate-spin" size={20} /> : 'Login'}
              </button>
              
              <button 
                type="button" 
                className="w-full sm:w-auto text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-bold px-6 py-3.5 rounded-full border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all focus:outline-none"
              >
                Cancel
              </button>
            </div>

            {/* 🌟 ส่วนที่เพิ่มใหม่: Register Link */}
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/50 text-center md:text-left animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] flex flex-wrap items-center justify-center md:justify-start gap-2">
                Don't have an account? 
                <Link 
                  href="/register" 
                  className="inline-flex items-center gap-1.5 text-[#1155FA] hover:text-[#0A3DCD] dark:text-blue-400 dark:hover:text-blue-300 transition-all font-black decoration-2 underline-offset-4 hover:underline group"
                >
                  <UserPlus size={14} className="group-hover:scale-110 transition-transform" />
                  Create Account
                </Link>
              </p>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}