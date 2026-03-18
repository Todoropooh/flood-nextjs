'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useTheme } from 'next-themes';

export default function DeviceMap({ devices = [], selectedDevice }: { devices: any[], selectedDevice?: any }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-full h-full bg-slate-100 dark:bg-[#151b2b] animate-pulse rounded-[2rem]"></div>;
  }

  const isDark = resolvedTheme === 'dark';
  
  const tileUrl = isDark 
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  const defaultCenter: [number, number] = [14.8818, 103.4936];
  const center = devices.length > 0 && devices[0].lat && devices[0].lng 
    ? [devices[0].lat, devices[0].lng] 
    : defaultCenter;

  const createCustomIcon = (device: any) => {
    // ✅ 1. รับค่าระยะเซนเซอร์ (อิงค่าเริ่มต้น 84.0 ตามหน้าแรก)
    const rawDist = Number(device.waterLevel ?? device.level ?? 84.0);
    
    // ✅ 2. คำนวณความสูงน้ำจริงด้วยสูตรเดียวกับหน้าหลัก (หักลบความคลาดเคลื่อน 5.0 ซม.)
    let wl = (84.0 - rawDist) - 5.0;
    
    // จัดการค่ารบกวน (Noise) และขีดจำกัดความสูงถัง 40 ซม.
    if (rawDist <= 0.5 || rawDist > 90) wl = 0; 
    if (wl < 0) wl = 0;
    if (wl > 40) wl = 40;
    
    // ✅ 3. เช็คเงื่อนไขสีหมุด (วิกฤต >= 20 [แดง], เตือน >= 10 [ส้ม], ปกติ [เขียว])
    const isCritical = wl >= 20.0;
    const isWarning = wl >= 10.0;
    
    const dotColor = isCritical ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-emerald-500';
    const textColor = isCritical ? 'text-red-600 dark:text-red-400' : isWarning ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400';
    const glowClass = isCritical ? 'shadow-[0_0_15px_rgba(239,68,68,0.8)]' : isWarning ? 'shadow-[0_0_15px_rgba(249,115,22,0.8)]' : 'shadow-[0_0_15px_rgba(16,185,129,0.8)]';

    const htmlString = `
      <div class="relative flex flex-col items-center -mt-8 cursor-pointer hover:-translate-y-1 transition-transform group z-50">
        <div class="bg-white/90 dark:bg-[#151b2b]/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg border border-white/50 dark:border-white/10 mb-1.5 flex flex-col items-center whitespace-nowrap group-hover:scale-110 transition-transform">
          <span class="text-[10px] font-bold text-slate-800 dark:text-white uppercase tracking-widest">${device.name}</span>
          <span class="text-[11px] font-black ${textColor}">${wl.toFixed(1)} cm</span>
        </div>
        <div class="w-4 h-4 rounded-full ${dotColor} ${glowClass} border-2 border-white dark:border-[#151b2b] relative">
           <div class="absolute inset-0 rounded-full ${dotColor} animate-ping opacity-50"></div>
        </div>
      </div>
    `;

    return L.divIcon({
      className: 'bg-transparent', 
      html: htmlString,
      iconSize: [120, 60],
      iconAnchor: [60, 45], 
      popupAnchor: [0, -45] 
    });
  };

  // ✅ ฟังก์ชันช่วยกำหนดสถานะข้อความใน Popup ให้ตรงกับเกณฑ์
  const getStatusInfo = (device: any) => {
    const rawDist = Number(device.waterLevel ?? device.level ?? 84.0);
    let wl = (84.0 - rawDist) - 5.0;
    if (rawDist <= 0.5 || rawDist > 90) wl = 0; 
    if (wl < 0) wl = 0;
    if (wl > 40) wl = 40;

    if (wl >= 20.0) return { text: 'อันตราย (Critical)', color: 'text-red-600' };
    if (wl >= 10.0) return { text: 'เฝ้าระวัง (Warning)', color: 'text-orange-600' };
    return { text: 'ปกติ (Stable)', color: 'text-emerald-600' };
  };

  return (
    <MapContainer 
      center={center as L.LatLngExpression} 
      zoom={14} 
      className="w-full h-full rounded-[2rem] z-0"
      zoomControl={false} 
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url={tileUrl}
      />
      
      {devices.map((device, idx) => {
         if (!device.lat || !device.lng) return null; 
         
         const statusInfo = getStatusInfo(device);

         return (
           <Marker 
             key={device.mac || idx} 
             position={[device.lat, device.lng]}
             icon={createCustomIcon(device)}
           >
             <Popup className="custom-popup">
               <div className="text-center p-1 font-sans">
                 <h3 className="font-bold text-sm text-slate-800">{device.name}</h3>
                 <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase">{device.mac}</p>
                 <p className={`text-[11px] font-bold mt-1 ${statusInfo.color}`}>
                   สถานะ: {statusInfo.text}
                 </p>
               </div>
             </Popup>
           </Marker>
         )
      })}
    </MapContainer>
  );
}