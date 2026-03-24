'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react'; // 🌟 ดึงสถานะ Login
import { 
  LayoutDashboard, 
  History, 
  BarChart3, 
  Settings,
  Waves,
  User,
  Lock
} from 'lucide-react';
import ProfileModal from '@/components/ProfileModal'; // 🌟 Import Modal ของเราเข้ามา

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isProfileOpen, setIsProfileOpen] = useState(false); // 🌟 State เปิด/ปิด Modal

  // 🛑 สั่งให้ Navbar "หายไป" ในกรณีเหล่านี้:
  // 1. ถ้าอยู่หน้าแรก (/) แล้ว "ยังไม่ได้ล็อกอิน" (เพราะหน้าแรกของพี่โชว์ LoginScreen)
  // 2. ถ้าเผลอหลุดไปหน้า /login หรือหน้า auth ของระบบ
  if (
    (pathname === '/' && status === 'unauthenticated') || 
    pathname === '/login' || 
    pathname.includes('/api/auth')
  ) {
    return null;
  }

  // 🌟 เมนูพื้นฐานที่ทุกคนเห็น
  let navItems = [
    { name: 'Dashboard', href: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'History', href: '/history', icon: <History size={20} /> },
    { name: 'Analytics', href: '/analytics', icon: <BarChart3 size={20} /> },
  ];

  // 🌟 ถ้าเป็น Admin ถึงจะดันปุ่ม Admin Portal เข้าไปใน Navbar
  if (status === 'authenticated' && (session?.user as any)?.role === 'admin') {
    navItems.push({ name: 'Admin', href: '/admin', icon: <Settings size={20} /> });
  }

  return (
    <>
      {/* 💻 Top Navbar (แสดงทั้ง Desktop และ Mobile แต่ปรับเลย์เอาต์ต่างกัน) */}
      <nav className="sticky top-0 z-[100] bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-3 shadow-sm">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          
          {/* 🌊 Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-2 bg-[#1155FA] rounded-lg text-white shadow-md group-hover:scale-110 transition-transform">
              <Waves size={18}/>
            </div>
            <span className="font-black text-slate-800 dark:text-white tracking-tighter text-lg hidden sm:block">
              FloodMonitor
            </span>
          </Link>

          {/* 🖥️ Desktop Menu Items (ซ่อนบนมือถือ) */}
          <div className="hidden md:flex items-center gap-2">
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

          {/* 👤 Profile / Login Button (มุมขวาบน) */}
          <div className="flex items-center gap-3">
            {status === 'loading' ? (
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
            ) : status === 'authenticated' ? (
              // 🟢 ถ้า Login แล้ว โชว์ปุ่ม Profile
              <button 
                onClick={() => setIsProfileOpen(true)}
                className="flex items-center gap-2 p-1.5 pr-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full hover:shadow-md transition-all group"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white overflow-hidden shrink-0">
                  {(session?.user as any)?.image ? (
                    <img src={(session?.user as any).image} className="w-full h-full object-cover" alt="Profile" />
                  ) : (
                    <User size={16} />
                  )}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-[10px] font-black text-slate-800 dark:text-white leading-tight">{(session?.user as any)?.firstname || 'My Profile'}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">{(session?.user as any)?.role}</p>
                </div>
              </button>
            ) : (
              // 🔴 ถ้ายังไม่ Login โชว์ปุ่ม Login (รูปแม่กุญแจ)
              <button 
                onClick={() => signIn()}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
              >
                <Lock size={14} /> <span className="hidden sm:inline">Sign In</span>
              </button>
            )}
          </div>

        </div>
      </nav>

      {/* 📱 Mobile Navbar (Bottom Navigation) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[90] bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl border-t border-slate-200 dark:border-slate-800 px-2 py-3 pb-6 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1)]">
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

      {/* 🌟 แสดง Modal เปลี่ยนรหัสผ่าน */}
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