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
    return <div className="w-full h-full bg-slate-100 dark:bg-[#151b2b] animate-pulse rounded-[2.5rem]"></div>;
  }

  const isDark = resolvedTheme === 'dark';
  
  const tileUrl = isDark 
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  const defaultCenter: [number, number] = [14.8818, 103.4936];
  const center = devices.length > 0 && devices[0].lat && devices[0].lng 
    ? [devices[0].lat, devices[0].lng] 
    : defaultCenter;

  // 🌟 ฟังก์ชันคำนวณระดับน้ำแบบ Dynamic ตามระยะติดตั้งของแต่ละโหนด
  const calculateWaterForDevice = (device: any) => {
    const installHeight = device.installHeight ?? 62.0;
    const rawDist = Number(device.waterLevel ?? device.level ?? installHeight);
    
    let wl = (installHeight - rawDist);
    
    // Noise Filter อิงตามระยะติดตั้งจริง
    if (rawDist <= 0.5 || rawDist > (installHeight + 10)) wl = 0; 
    if (wl < 0) wl = 0;
    if (wl > 40) wl = 40;
    
    return wl;
  };

  const createCustomIcon = (device: any) => {
    const wl = calculateWaterForDevice(device);
    
    // 🌟 ดึงเกณฑ์แจ้งเตือนรายอุปกรณ์
    const warningThresh = device.warningThreshold ?? 5.0;
    const criticalThresh = device.criticalThreshold ?? 10.0;

    const isCritical = wl >= criticalThresh;
    const isWarning = wl >= warningThresh;
    
    const dotColor = isCritical ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-emerald-500';
    const textColor = isCritical ? 'text-red-600 dark:text-red-400' : isWarning ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400';
    const glowClass = isCritical ? 'shadow-[0_0_20px_rgba(239,68,68,0.8)]' : isWarning ? 'shadow-[0_0_20px_rgba(249,115,22,0.8)]' : 'shadow-[0_0_15px_rgba(16,185,129,0.5)]';

    const htmlString = `
      <div class="relative flex flex-col items-center -mt-8 cursor-pointer hover:-translate-y-1 transition-transform group z-50">
        <div class="bg-white/95 dark:bg-[#151b2b]/95 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-xl border border-white/50 dark:border-white/10 mb-2 flex flex-col items-center whitespace-nowrap scale-90 group-hover:scale-100 transition-transform">
          <span class="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] mb-0.5">${device.name}</span>
          <span class="text-[12px] font-black ${textColor}">${wl.toFixed(1)} cm</span>
        </div>
        <div class="w-5 h-5 rounded-full ${dotColor} ${glowClass} border-4 border-white dark:border-[#020617] relative">
            <div class="absolute inset-0 rounded-full ${dotColor} animate-ping opacity-60"></div>
        </div>
      </div>
    `;

    return L.divIcon({
      className: 'bg-transparent', 
      html: htmlString,
      iconSize: [120, 70],
      iconAnchor: [60, 55], 
      popupAnchor: [0, -55] 
    });
  };

  const getStatusInfo = (device: any) => {
    const wl = calculateWaterForDevice(device);
    const warningThresh = device.warningThreshold ?? 5.0;
    const criticalThresh = device.criticalThreshold ?? 10.0;

    if (wl >= criticalThresh) return { text: 'อันตราย (Critical)', color: 'text-red-600 dark:text-red-400' };
    if (wl >= warningThresh) return { text: 'เฝ้าระวัง (Warning)', color: 'text-orange-600 dark:text-orange-400' };
    return { text: 'ปกติ (Stable)', color: 'text-emerald-600 dark:text-emerald-400' };
  };

  return (
    <MapContainer 
      center={center as L.LatLngExpression} 
      zoom={14} 
      className="w-full h-full rounded-[2.5rem] z-0 shadow-inner"
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
                <div className="text-center p-2 font-sans min-w-[120px]">
                  <h3 className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-tight">{device.name}</h3>
                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-2"></div>
                  <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">{device.mac}</p>
                  <p className={`text-[11px] font-black mt-2 uppercase tracking-wider ${statusInfo.color}`}>
                    {statusInfo.text}
                  </p>
                </div>
              </Popup>
            </Marker>
          )
      })}
    </MapContainer>
  );
}