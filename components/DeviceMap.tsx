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
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  const defaultCenter: [number, number] = [14.8818, 103.4936];
  const center = devices.length > 0 && devices[0].lat && devices[0].lng 
    ? [devices[0].lat, devices[0].lng] 
    : defaultCenter;

  const createCustomIcon = (device: any) => {
    // ✅ 1. รับค่าระยะเซนเซอร์ (ถ้าไม่มีให้ถือว่าว่าง = 70)
    const rawDist = Number(device.waterLevel ?? device.level ?? 70);
    
    // ✅ 2. คำนวณความสูงน้ำ (ติดตั้ง 70 ซม. กล่องสูง 20 ซม.)
    let wl = 70 - rawDist;
    if (wl < 0) wl = 0;
    if (wl > 20) wl = 20;
    
    // ✅ 3. เช็คเงื่อนไขสีหมุด (วิกฤต >= 17, เตือน >= 10)
    const isCritical = wl >= 17;
    const isWarning = wl >= 10;
    
    const dotColor = isCritical ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-emerald-500';
    const textColor = isCritical ? 'text-red-600 dark:text-red-400' : isWarning ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400';
    const glowClass = isCritical ? 'shadow-[0_0_15px_rgba(239,68,68,0.8)]' : isWarning ? 'shadow-[0_0_15px_rgba(249,115,22,0.8)]' : 'shadow-[0_0_15px_rgba(16,185,129,0.8)]';

    const htmlString = `
      <div class="relative flex flex-col items-center -mt-8 cursor-pointer hover:-translate-y-1 transition-transform group z-50">
        <div class="bg-white/80 dark:bg-[#151b2b]/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg border border-white/50 dark:border-white/10 mb-1.5 flex flex-col items-center whitespace-nowrap group-hover:scale-110 transition-transform">
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

  return (
    <MapContainer 
      center={center as L.LatLngExpression} 
      zoom={11} 
      className="w-full h-full rounded-[2rem] z-0"
      zoomControl={false} 
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url={tileUrl}
      />
      
      {devices.map((device, idx) => {
         if (!device.lat || !device.lng) return null; 
         return (
           <Marker 
             key={device.mac || idx} 
             position={[device.lat, device.lng]}
             icon={createCustomIcon(device)}
           >
             <Popup className="custom-popup">
               <div className="text-center p-1 font-sans">
                 <h3 className="font-bold text-sm text-slate-800">${device.name}</h3>
                 <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase">${device.mac}</p>
               </div>
             </Popup>
           </Marker>
         )
      })}
    </MapContainer>
  );
}