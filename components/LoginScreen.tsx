'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Waves, Loader2, User, Lock, ShieldCheck } from 'lucide-react';

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="relative min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#020617] overflow-hidden">
      {/* 🌟 Background Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/30 dark:bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/20 dark:bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* 🛡️ Login Card (Glassmorphism) */}
      <div className="relative z-10 w-full max-w-md p-8 sm:p-10 mx-4 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] border border-white/50 dark:border-slate-700/50">
        
        {/* Logo & Header */}
        <div className="text-center mb-10">
          <div className="mx-auto w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-6 transform transition-transform hover:scale-105">
            <Waves size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
            Flood<span className="text-blue-600 dark:text-blue-500">Monitor</span>
          </h1>
          <p className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 mt-3 uppercase tracking-[0.2em]">
            <ShieldCheck size={14} className="text-emerald-500" /> Secure Access
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Username Input */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <User size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Username"
              className="w-full pl-11 pr-4 py-4 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 dark:focus:border-blue-500 transition-all text-sm font-bold text-slate-800 dark:text-white placeholder:font-medium"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          {/* Password Input */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input
              type="password"
              placeholder="Password"
              className={`w-full pl-11 pr-4 py-4 bg-slate-100/50 dark:bg-slate-800/50 border rounded-2xl outline-none focus:bg-white dark:focus:bg-slate-800 transition-all text-sm font-bold text-slate-800 dark:text-white placeholder:font-medium ${
                loginError 
                  ? "border-red-500 focus:border-red-500" 
                  : "border-slate-200 dark:border-slate-700/50 focus:border-blue-500 dark:focus:border-blue-500"
              }`}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setLoginError("");
              }}
              required
            />
          </div>

          {/* Error Message */}
          {loginError && (
            <div className="bg-red-50 dark:bg-red-500/10 text-red-500 text-xs font-bold px-4 py-3 rounded-xl border border-red-100 dark:border-red-500/20 text-center animate-in fade-in slide-in-from-top-2">
              {loginError}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isAuthenticating}
            className="relative w-full overflow-hidden bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all duration-300 shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] flex justify-center items-center mt-2 group"
          >
            {isAuthenticating ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <span className="relative z-10 flex items-center gap-2">
                Sign In
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}