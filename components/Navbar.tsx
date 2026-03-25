'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react'; 
import { useTheme } from 'next-themes';
import { 
  LayoutDashboard, 
  History, 
  BarChart3, 
  Settings,
  Waves,
  User,
  Lock,
  LogOut,
  Moon,
  Sun
} from 'lucide-react';
import ProfileModal from '@/components/ProfileModal'; 

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isProfileOpen, setIsProfileOpen] = useState(false); 
  
  // 🌟 นำระบบจัดการ Theme กลับมา
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // ป้องกัน Hydration mismatch
  useEffect(() => setMounted(true), []);

  if (
    pathname === '/login' || 
    pathname === '/register' || 
    pathname.includes('/api/auth')
  ) {
    return null; 
  }

  let navItems = [
    { name: 'Dashboard', href: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'History', href: '/history', icon: <History size={20} /> },
    { name: 'Analytics', href: '/analytics', icon: <BarChart3 size={20} /> },
  ];

  if (status === 'authenticated' && (session?.user as any)?.role === 'admin') {
    navItems.push({ name: 'Admin', href: '/admin', icon: <Settings size={20} /> });
  }

  return (
    <>
      {/* 💻 Top Navbar (Glassmorphism) */}
      <nav className="sticky top-0 z-[100] bg-white/30 dark:bg-[#0f172a]/40 backdrop-blur-xl border-b border-white/50 dark:border-white/10 px-4 md:px-8 py-3 shadow-sm transition-colors duration-300">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-2 bg-blue-600/90 rounded-xl text-white shadow-lg border border-white/20 backdrop-blur-md group-hover:scale-105 transition-transform duration-300">
              <Waves size={18} className="group-hover:animate-pulse" />
            </div>
            <span className="font-black text-slate-800 dark:text-white tracking-tight text-lg hidden sm:block drop-shadow-sm transition-colors">
              FloodMonitor
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-2 bg-white/20 dark:bg-black/20 p-1.5 rounded-2xl border border-white/30 dark:border-white/5 backdrop-blur-md shadow-inner">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link 
                  key={item.name} 
                  href={item.href}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300
                    ${isActive 
                      ? 'bg-white/80 dark:bg-white/10 text-blue-600 dark:text-blue-400 shadow-sm border border-white/50 dark:border-white/5' 
                      : 'border border-transparent text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                  {item.icon}
                  {item.name}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            {status === 'loading' || !mounted ? (
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
                 <div className="w-32 h-10 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse hidden sm:block" />
              </div>
            ) : status === 'authenticated' ? (
              <div className="flex items-center gap-2">
                
                {/* 🌟 Theme Toggle Button (Glass) */}
                <button
                  onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                  className="p-2.5 rounded-xl bg-white/40 dark:bg-black/40 border border-white/50 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-black/60 backdrop-blur-md transition-all shadow-sm group"
                  aria-label="Toggle Dark Mode"
                >
                  {resolvedTheme === 'dark' ? (
                    <Sun size={18} className="group-hover:text-amber-400 group-hover:rotate-45 transition-all duration-500" />
                  ) : (
                    <Moon size={18} className="group-hover:text-blue-500 group-hover:-rotate-12 transition-all duration-500" />
                  )}
                </button>

                {/* 👤 Profile Button (Glass) */}
                <button 
                  onClick={() => setIsProfileOpen(true)}
                  className="flex items-center gap-3 p-1.5 pr-4 ml-1 bg-white/50 dark:bg-black/40 border border-white/50 dark:border-white/10 rounded-full hover:bg-white/80 dark:hover:bg-black/60 shadow-sm backdrop-blur-md transition-all group"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white overflow-hidden shrink-0 border border-white/50 shadow-inner group-hover:scale-105 transition-transform">
                    {(session?.user as any)?.image ? (
                      <img src={(session?.user as any).image} className="w-full h-full object-cover" alt="Profile" />
                    ) : (
                      <User size={16} />
                    )}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-[10px] font-black text-slate-800 dark:text-white leading-tight drop-shadow-sm transition-colors">{(session?.user as any)?.firstname || 'My Profile'}</p>
                    <p className="text-[9px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest transition-colors">{(session?.user as any)?.role}</p>
                  </div>
                </button>

                {/* 🚪 Logout Button */}
                <button 
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="p-2.5 ml-1 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-xl transition-all backdrop-blur-md"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <Link 
                href="/login"
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600/90 text-white hover:bg-blue-500 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/30 border border-white/20 backdrop-blur-md"
              >
                <Lock size={14} /> <span className="hidden sm:inline">Sign In</span>
              </Link>
            )}
          </div>

        </div>
      </nav>

      {/* 📱 Mobile Navbar (Glassmorphism) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[90] bg-white/40 dark:bg-black/60 backdrop-blur-[40px] border-t border-white/40 dark:border-white/10 px-2 py-2 pb-6 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1)]">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex flex-col items-center gap-1.5 transition-all w-16 ${isActive ? 'text-blue-600 dark:text-blue-400 -translate-y-2' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                <div className={`p-2.5 rounded-2xl backdrop-blur-md transition-all ${isActive ? 'bg-white/80 dark:bg-white/10 border border-white/50 dark:border-white/20 shadow-lg' : 'border border-transparent'}`}>
                  {item.icon}
                </div>
                <span className={`text-[8px] font-black uppercase tracking-widest drop-shadow-sm ${isActive ? 'opacity-100' : 'opacity-0'}`}>{item.name}</span>
              </Link>
            );
          })}
          
          {/* Mobile Theme & Profile Controls */}
          {status === 'authenticated' && mounted && (
            <button 
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="flex flex-col items-center gap-1.5 text-slate-500 dark:text-slate-400 transition-all w-16"
            >
              <div className="p-2.5 rounded-2xl border border-transparent backdrop-blur-md">
                {resolvedTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest opacity-0">Theme</span>
            </button>
          )}
        </div>
      </nav>

      {status === 'authenticated' && (
        <ProfileModal 
          isOpen={isProfileOpen} 
          onClose={() => setIsProfileOpen(false)} 
          userData={session?.user} 
        />
      )}
    </>
  );
}