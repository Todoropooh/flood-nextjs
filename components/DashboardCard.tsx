'use client';

import { useEffect, useState } from 'react';

interface Props {
  title: string;
  value: string | number;
  unit?: string;
  trend?: string;
  icon?: React.ReactNode;
  color?: string;
}

export default function DashboardCard({ title, value, unit, trend, icon, color = "text-slate-800" }: Props) {
  // ✨ ป้องกัน Hydration Error: ตรวจสอบว่าคอมโพเนนต์โหลดบนเบราว์เซอร์เสร็จหรือยัง
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ถ้ายังโหลดไม่เสร็จ ให้โชว์โครงสร้างเปล่าๆ ไว้ก่อน (ป้องกันแอปแครช)
  if (!mounted) {
    return <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[140px] animate-pulse" />;
  }

  // ✨ ป้องกันการเรียกใช้ .toFixed หรือฟังก์ชันอื่นบนค่าที่ไม่ใช่ตัวเลข
  const displayValue = value !== undefined && value !== null ? value : "0.0";

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wide truncate pr-2">
          {title}
        </h3>
        {icon && <div className="text-slate-400 shrink-0">{icon}</div>}
      </div>
      
      <div className="flex items-baseline gap-2 overflow-hidden">
        <span className={`text-3xl md:text-4xl font-bold truncate ${color}`}>
          {displayValue}
        </span>
        {unit && (
          <span className="text-slate-400 text-sm font-medium shrink-0">
            {unit}
          </span>
        )}
      </div>

      {trend ? (
        <div className={`mt-2 text-xs font-medium truncate ${trend.includes('+') ? 'text-emerald-500' : 'text-red-500'}`}>
          {trend} vs last hour
        </div>
      ) : (
        <div className="mt-2 h-4" /> // รักษาความสูงของการ์ดให้เท่ากัน
      )}
    </div>
  );
}