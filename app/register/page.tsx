'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { User, AlertCircle, ArrowRight, Sun, Moon, Type, Mail, Phone, Lock } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  const { setTheme, resolvedTheme } = useTheme();
  const router = useRouter();

  useEffect(() => { setIsMounted(true); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstname, lastname, email, phone, username, password, role: 'user' }), 
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Registration failed. Please try again.');
      }
      router.push('/login');
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  if (!isMounted) return null;

  return (
    // 💡 เปลี่ยนกลับเป็น min-h-screen เผื่อจอเล็กจะได้ไม่บั๊ก และใส่ py-10 ให้มีขอบบนล่าง
    <main className="min-h-screen w-full flex items-center justify-center relative font-sans overflow-y-auto py-10">
      
      {/* 🌌 Background */}
      <div className="fixed inset-0 -z-10 bg-[#0f172a]">
        <img 
          src="https://images.pexels.com/photos/1295138/pexels-photo-1295138.jpeg" 
          className="w-full h-full object-cover opacity-100"
          alt="background"
        />
        <div className="absolute inset-0 bg-white/20 dark:bg-black/70 backdrop-blur-2xl transition-colors duration-500" />
      </div>

      {/* 🌗 Theme Toggle */}
      <div className="absolute top-6 right-6 z-50 fixed">
        <div className="flex items-center bg-black/10 dark:bg-white/10 p-1 rounded-full backdrop-blur-md border border-white/20 dark:border-white/5">
          <button onClick={() => setTheme('light')} className={`p-1.5 rounded-full transition-all duration-300 ${resolvedTheme === 'light' ? 'bg-white text-blue-500 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}><Sun size={12}/></button>
          <button onClick={() => setTheme('dark')} className={`p-1.5 rounded-full transition-all duration-300 ${resolvedTheme === 'dark' ? 'bg-[#2C2C2E] text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}><Moon size={12}/></button>
        </div>
      </div>

      {/* 💡 ใช้ max-w-lg (แคบลงมา) เพื่อให้ทรงการ์ดเป็นแนวตั้งสวยงาม ไม่ดูแบน */}
      <div className="w-full max-w-lg relative z-10 px-4">
        
        <div className="bg-white/60 dark:bg-[#1C1C1E]/60 rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-white/10 backdrop-blur-xl overflow-hidden transform transition-all">
          
          {/* Header */}
          <div className="p-8 pb-4 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-indigo-600 rounded-3xl shadow-lg shadow-indigo-500/30">
                <User size={28} className="text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-black uppercase tracking-widest text-slate-800 dark:text-white leading-none">
              Create <span className="text-indigo-600 dark:text-indigo-400">Account</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">
              Personal Info & Identity
            </p>
          </div>

          <div className="p-8 pt-2">
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wide">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* 🧑‍🤝‍🧑 First & Last Name (อยู่คู่กัน) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                    <Type size={16} />
                  </div>
                  <input type="text" required value={firstname} onChange={(e) => setFirstname(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white/50 dark:bg-black/20 border border-white/50 dark:border-white/10 rounded-2xl text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all backdrop-blur-sm placeholder:text-slate-400/70"
                    placeholder="First Name" />
                </div>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                    <Type size={16} />
                  </div>
                  <input type="text" value={lastname} onChange={(e) => setLastname(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white/50 dark:bg-black/20 border border-white/50 dark:border-white/10 rounded-2xl text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all backdrop-blur-sm placeholder:text-slate-400/70"
                    placeholder="Last Name" />
                </div>
              </div>

              {/* 📧 Email & 📱 Phone (อยู่คู่กัน) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                    <Mail size={16} />
                  </div>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white/50 dark:bg-black/20 border border-white/50 dark:border-white/10 rounded-2xl text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all backdrop-blur-sm placeholder:text-slate-400/70"
                    placeholder="Email Address" />
                </div>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                    <Phone size={16} />
                  </div>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white/50 dark:bg-black/20 border border-white/50 dark:border-white/10 rounded-2xl text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all backdrop-blur-sm placeholder:text-slate-400/70"
                    placeholder="Phone Number" />
                </div>
              </div>

              {/* 🔑 Username & Password (ยาวเต็มบรรทัด ให้อ่านง่ายขึ้น) */}
              <div className="space-y-3 pt-2">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                    <User size={16} />
                  </div>
                  <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white/50 dark:bg-black/20 border border-white/50 dark:border-white/10 rounded-2xl text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all backdrop-blur-sm placeholder:text-slate-400/70"
                    placeholder="Create Username" />
                </div>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                    <Lock size={16} />
                  </div>
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white/50 dark:bg-black/20 border border-white/50 dark:border-white/10 rounded-2xl text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all backdrop-blur-sm placeholder:text-slate-400/70"
                    placeholder="Create Password" />
                </div>
              </div>

              {/* Submit Button */}
              <button type="submit" disabled={isLoading}
                className="w-full mt-4 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/30 active:scale-95 flex justify-center items-center gap-2 disabled:opacity-70"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>Create Account <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-200/50 dark:border-slate-700/50 text-center">
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Already have an account?{' '}
                <Link href="/login" className="text-indigo-600 dark:text-indigo-400 font-black hover:underline transition-all ml-1">
                  Sign In
                </Link>
              </p>
            </div>
            
          </div>
        </div>
      </div>
    </main>
  );
}