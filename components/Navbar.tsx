'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react'; 
import { 
  LayoutDashboard, 
  History, 
  BarChart3, 
  Settings,
  Waves,
  User,
  Lock,
  LogOut 
} from 'lucide-react';
import ProfileModal from '@/components/ProfileModal'; 

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isProfileOpen, setIsProfileOpen] = useState(false); 

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

  const isDark = true; // คลาสของ Tailwind จะจัดการ dark mode เอง แต่เราเผื่อ logic ไว้ได้

  return (
    <>
      {/* 💻 Top Navbar (Glassmorphism) */}
      <nav className="sticky top-0 z-[100] bg-white/40 dark:bg-black/40 backdrop-blur-2xl border-b border-white/40 dark:border-white/10 px-4 md:px-8 py-3 shadow-sm transition-all">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-2 bg-blue-600/90 rounded-lg text-white shadow-lg border border-white/20 backdrop-blur-md group-hover:scale-110 transition-transform">
              <Waves size={18}/>
            </div>
            <span className="font-black text-slate-800 dark:text-white tracking-tighter text-lg hidden sm:block drop-shadow-sm">
              FloodMonitor
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link 
                  key={item.name} 
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all backdrop-blur-md border
                    ${isActive 
                      ? 'bg-white/60 dark:bg-white/10 text-blue-600 dark:text-blue-400 border-white/50 dark:border-white/20 shadow-sm' 
                      : 'border-transparent text-slate-600 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-white/5 hover:border-white/30 dark:hover:border-white/10'
                    }`}
                >
                  {item.icon}
                  {item.name}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            {status === 'loading' ? (
              <div className="w-8 h-8 rounded-full bg-white/40 dark:bg-black/40 animate-pulse border border-white/20" />
            ) : status === 'authenticated' ? (
              <div className="flex items-center gap-2">
                {/* 👤 Profile Button (Glass) */}
                <button 
                  onClick={() => setIsProfileOpen(true)}
                  className="flex items-center gap-2 p-1.5 pr-4 bg-white/50 dark:bg-black/40 border border-white/40 dark:border-white/10 rounded-full hover:bg-white/70 dark:hover:bg-black/60 shadow-sm backdrop-blur-md transition-all group"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white overflow-hidden shrink-0 border border-white/20 shadow-inner">
                    {(session?.user as any)?.image ? (
                      <img src={(session?.user as any).image} className="w-full h-full object-cover" alt="Profile" />
                    ) : (
                      <User size={16} />
                    )}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-[10px] font-black text-slate-800 dark:text-white leading-tight drop-shadow-sm">{(session?.user as any)?.firstname || 'My Profile'}</p>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase">{(session?.user as any)?.role}</p>
                  </div>
                </button>

                {/* 🚪 Logout Button (Glass Warning) */}
                <button 
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/20 border border-transparent hover:border-red-500/30 rounded-full transition-all backdrop-blur-md"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <Link 
                href="/login"
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600/90 text-white hover:bg-blue-600 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 border border-white/20 backdrop-blur-md"
              >
                <Lock size={14} /> <span className="hidden sm:inline">Sign In</span>
              </Link>
            )}
          </div>

        </div>
      </nav>

      {/* 📱 Mobile Navbar (Glassmorphism) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[90] bg-white/40 dark:bg-black/50 backdrop-blur-[40px] border-t border-white/40 dark:border-white/10 px-2 py-3 pb-6 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1)]">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'text-blue-600 dark:text-blue-400 scale-110' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                <div className={`p-2 rounded-xl backdrop-blur-md border ${isActive ? 'bg-white/60 dark:bg-white/10 border-white/50 dark:border-white/20 shadow-sm' : 'border-transparent'}`}>
                  {item.icon}
                </div>
                <span className="text-[9px] font-black uppercase tracking-tighter drop-shadow-sm">{item.name}</span>
              </Link>
            );
          })}
          {status === 'authenticated' && (
            <button 
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex flex-col items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-all"
            >
              <div className="p-2 border border-transparent">
                <LogOut size={20} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-tighter drop-shadow-sm">Logout</span>
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