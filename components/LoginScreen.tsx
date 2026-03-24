'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Waves, Loader2, Check, Eye, EyeOff } from 'lucide-react';

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
    // 🌟 1. Main Container: เอา bg-color ออก เปลี่ยนเป็น relative + overflow-hidden เพื่อขังรูปภาพไว้ด้านหลัง
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 font-sans transition-all duration-300 relative overflow-hidden">
      
      {/* 🌟 2. 🏞️ รูปภาพน้ำท่วมเบลอ (Background Layer) */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0 blur-md scale-105 pointer-events-none"
        // 🔗 เปลี่ยน URL รูปภาพได้ตรงนี้นะครับ
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1547683905-f686c993aae5?q=80&w=1974&auto=format&fit=crop')" }}
      >
        {/* Layer สีดำจางๆ เพื่อให้กล่องสีขาวข้างหน้าเด่นขึ้น */}
        <div className="absolute inset-0 bg-slate-900/30"></div>
      </div>

      {/* 🌟 3. Front Card Container: ปรับสีพื้นหลังให้โปร่งแสงนิดๆ (Glassmorphism) และดันให้อยู่เหนือรูปภาพ (z-10) */}
      <div className="w-full max-w-5xl bg-white/95 backdrop-blur-sm rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] flex flex-col md:flex-row overflow-hidden relative z-10">

        {/* 🌊 ด้านซ้าย: พื้นหลังสีน้ำเงิน + เอฟเฟกต์คลื่นน้ำ */}
        <div className="relative w-full md:w-5/12 bg-gradient-to-b from-[#1155FA] to-[#0A3DCD] text-white flex flex-col items-center justify-center px-10 py-16 md:py-24 md:pr-24 min-h-[350px] md:min-h-[600px] z-10">
          
          {/* Content */}
          <div className="relative z-20 flex flex-col items-center text-center">
            {/* โลโก้วงกลมสีขาว */}
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.12)] mb-6 transform transition-transform hover:scale-105">
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

          {/* 💧 หยดน้ำตกแต่ง */}
          <div className="absolute top-[15%] left-[20%] w-3 h-3 bg-white/20 rounded-full animate-pulse" />
          <div className="absolute top-[40%] left-[10%] w-4 h-4 bg-white/30 rounded-full animate-bounce" style={{ animationDuration: '3s' }} />
          <div className="absolute bottom-[25%] left-[25%] w-2 h-2 bg-white/40 rounded-full animate-ping" style={{ animationDuration: '4s' }} />

          {/* 🌊 เอฟเฟกต์คลื่นน้ำ (Water Wave) สำหรับ "จอคอม" */}
          <div className="hidden md:block absolute top-0 right-[-1px] h-full w-[120px] z-0 pointer-events-none">
            <svg viewBox="0 0 100 800" preserveAspectRatio="none" className="w-full h-full text-white/95 fill-current">
              {/* คลื่นชั้นหลัง (โปร่งใส) */}
              <path d="M100,0 C30,150 120,300 40,500 C-20,700 80,800 100,800 Z" fillOpacity="0.2" />
              {/* คลื่นชั้นหน้า (สีขาวทึบกลืนไปกับฟอร์ม) */}
              <path d="M100,0 C70,200 150,450 20,650 C-20,750 70,800 100,800 Z" />
            </svg>
          </div>

          {/* 🌊 เอฟเฟกต์คลื่นน้ำ (Water Wave) สำหรับ "จอมือถือ" */}
          <div className="block md:hidden absolute bottom-[-1px] left-0 w-full h-[80px] z-0 pointer-events-none">
            <svg viewBox="0 0 800 100" preserveAspectRatio="none" className="w-full h-full text-white/95 fill-current">
              {/* คลื่นชั้นหลัง (โปร่งใส) */}
              <path d="M0,100 C150,30 300,120 500,40 C700,-20 800,80 800,100 Z" fillOpacity="0.2" />
              {/* คลื่นชั้นหน้า (สีขาวทึบกลืนไปกับฟอร์ม) */}
              <path d="M0,100 C200,70 450,150 650,20 C750,-20 800,70 800,100 Z" />
            </svg>
          </div>
        </div>

        {/* 📝 ด้านขวา: ฟอร์ม Login */}
        <div className="w-full md:w-7/12 p-10 sm:p-16 md:p-20 md:pl-28 flex flex-col justify-center relative z-20">
          
          <h3 className="text-2xl md:text-3xl font-black text-slate-800 mb-10 text-center md:text-left select-none">
            Login to your account
          </h3>

          <form onSubmit={handleLogin} className="space-y-8 max-w-sm mx-auto md:mx-0 w-full">
            
            {/* Input: Username */}
            <div className="space-y-2 relative group">
              <label className="text-[13px] font-bold text-slate-800 select-none">Username</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter your username"
                  className="w-full pb-3 pt-1 border-b-2 border-slate-200 outline-none focus:border-[#1155FA] transition-colors text-slate-700 font-medium placeholder:text-slate-400 placeholder:font-normal bg-transparent"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <div className="absolute right-0 top-2 text-[#1155FA]/30 group-focus-within:text-[#1155FA] transition-colors pointer-events-none">
                  <Check size={18} />
                </div>
              </div>
            </div>

            {/* Input: Password */}
            <div className="space-y-2 relative group">
              <label className="text-[13px] font-bold text-slate-800 select-none">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="w-full pb-3 pt-1 pr-10 border-b-2 border-slate-200 outline-none focus:border-[#1155FA] transition-colors text-slate-700 font-medium placeholder:text-slate-400 placeholder:font-normal bg-transparent"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setLoginError("");
                  }}
                  required
                />
                
                {/* ปุ่มลูกตาเปิด/ปิด */}
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-0 top-2 text-slate-400 hover:text-[#1155FA] transition-colors focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* แจ้งเตือน Error */}
            {loginError && (
              <p className="text-red-500 text-xs font-bold animate-pulse">
                {loginError}
              </p>
            )}

            {/* Terms & Button */}
            <div className="pt-4 flex flex-col sm:flex-row items-center gap-6">
              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full sm:w-auto bg-[#1155FA] hover:bg-[#0A3DCD] disabled:bg-blue-300 text-white rounded-full px-10 py-3.5 font-bold shadow-[0_8px_20px_rgba(17,85,250,0.3)] hover:shadow-[0_8px_25px_rgba(17,85,250,0.4)] transition-all flex items-center justify-center min-w-[160px] active:scale-95"
              >
                {isAuthenticating ? <Loader2 className="animate-spin" size={20} /> : 'Login'}
              </button>
              
              <button type="button" className="w-full sm:w-auto text-slate-400 hover:text-slate-600 font-bold px-6 py-3.5 rounded-full border-2 border-transparent hover:border-slate-200 transition-all focus:outline-none">
                Cancel
              </button>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}