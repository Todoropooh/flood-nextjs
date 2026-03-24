'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  History, 
  Bell, 
  BarChart3, 
  Settings,
  Waves
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  // กำหนดรายการเมนู
  const navItems = [
    { name: 'Dashboard', href: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'History', href: '/history', icon: <History size={20} /> },
    { name: 'Analytics', href: '/analytics', icon: <BarChart3 size={20} /> },
    { name: 'Alerts', href: '/alerts', icon: <Bell size={20} /> },
    { name: 'Settings', href: '/admin', icon: <Settings size={20} /> },
  ];

  return (
    <>
      {/* 💻 Desktop Navbar (Top) */}
      <nav className="hidden md:block sticky top-0 z-[100] bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-8 py-3 shadow-sm">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-2 bg-[#1155FA] rounded-lg text-white shadow-md group-hover:scale-110 transition-transform">
              <Waves size={18}/>
            </div>
            <span className="font-black text-slate-800 dark:text-white tracking-tighter text-lg">FloodMonitor</span>
          </Link>

          {/* Menu Items */}
          <div className="flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link 
                  key={item.name} 
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all
                    ${isActive 
                      ? 'bg-blue-50 dark:bg-blue-500/10 text-[#1155FA] shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                >
                  {item.icon}
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* 📱 Mobile Navbar (Bottom Navigation) - 🌟 UX: กดง่ายด้วยนิ้วโป้ง */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl border-t border-slate-200 dark:border-slate-800 px-2 py-3 pb-6 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1)]">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'text-[#1155FA] scale-110' : 'text-slate-400'}`}
              >
                <div className={`p-2 rounded-xl ${isActive ? 'bg-blue-50 dark:bg-blue-500/10' : ''}`}>
                  {item.icon}
                </div>
                <span className="text-[9px] font-black uppercase tracking-tighter">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}