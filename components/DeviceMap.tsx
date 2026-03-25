'use client';

import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useTheme } from 'next-themes';

// 🌟 Component เสริมเพื่อบังคับให้แผนที่ขยับเมื่อ selectedMac เปลี่ยน
function MapUpdater({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, {
      duration: 1.5,
      easeLinearity: 0.25
    });
  }, [center, zoom, map]);
  return null;
}

export default function DeviceMap({ devices = [], selectedMac = 'ALL' }: { devices: any[], selectedMac?: string }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 🌟 [แก้ Error] ย้าย Hook useMemo ขึ้นมาไว้ด้านบน ห้ามมี Return มาขวางก่อน
  const mapCenterAndZoom = useMemo(() => {
    const defaultCenter: [number, number] = [14.8824, 103.4936]; // พิกัดหลัก
    
    if (devices.length === 0) return { center: defaultCenter, zoom: 14 };

    if (selectedMac === 'ALL') {
      // ถ้าดู ALL ให้หาค่าเฉลี่ยจุดกึ่งกลางของทุกสถานี (หรือใช้ตัวแรก)
      const validDevices = devices.filter(d => d.lat && d.lng);
      if (validDevices.length === 0) return { center: defaultCenter, zoom: 14 };
      
      const avgLat = validDevices.reduce((sum, d) => sum + d.lat, 0) / validDevices.length;
      const avgLng = validDevices.reduce((sum, d) => sum + d.lng, 0) / validDevices.length;
      return { center: [avgLat, avgLng] as [number, number], zoom: 13 }; // ซูมออกนิดนึงให้เห็นครบ
    } else {
      // ถ้าเลือกสถานีเจาะจง ให้ซูมเข้าไปที่สถานีนั้น
      const targetDevice = devices.find(d => d.mac === selectedMac);
      if (targetDevice && targetDevice.lat && targetDevice.lng) {
        return { center: [targetDevice.lat, targetDevice.lng] as [number, number], zoom: 16 }; // ซูมเข้าใกล้ๆ
      }
    }
    return { center: defaultCenter, zoom: 14 };
  }, [devices, selectedMac]);

  const isDark = resolvedTheme === 'dark';
  
  // 🎨 สไตล์แผนที่ (ใช้ของ CartoDB เพื่อความมินิมอล)
  const tileUrl = isDark 
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  const createCustomIcon = (device: any) => {
    const wl = Number(device.waterLevel || 0);
    const warningThresh = device.warningThreshold ?? 5.0;
    const criticalThresh = device.criticalThreshold ?? 10.0;

    const isCritical = wl >= criticalThresh;
    const isWarning = wl >= warningThresh;
    
    const dotColor = isCritical ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-emerald-500';
    const textColor = isCritical ? 'text-red-500' : isWarning ? 'text-orange-500' : 'text-emerald-500';
    const glowClass = isCritical ? 'shadow-[0_0_20px_rgba(239,68,68,0.8)]' : isWarning ? 'shadow-[0_0_20px_rgba(249,115,22,0.8)]' : 'shadow-[0_0_15px_rgba(16,185,129,0.5)]';

    // 🌟 [UI อัปเกรด] ป้ายชื่อ Marker แบบโปร่งแสง
    const htmlString = `
      <div class="relative flex flex-col items-center -mt-8 cursor-pointer transition-transform group z-50 hover:scale-110 duration-300">
        <div class="bg-white/80 dark:bg-black/80 backdrop-blur-md px-4 py-2 rounded-[1rem] shadow-xl border border-white/50 dark:border-white/10 mb-2 flex flex-col items-center whitespace-nowrap transition-transform">
          <span class="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-0.5">${device.name}</span>
          <span class="text-[12px] font-black ${textColor} drop-shadow-sm">${wl.toFixed(2)} cm</span>
        </div>
        <div class="w-5 h-5 rounded-full ${dotColor} ${glowClass} border-4 border-white dark:border-[#0f172a] relative">
            <div class="absolute inset-0 rounded-full ${dotColor} animate-ping opacity-70"></div>
        </div>
      </div>
    `;

    return L.divIcon({
      className: 'bg-transparent', 
      html: htmlString,
      iconSize: [140, 80],
      iconAnchor: [70, 60], 
      popupAnchor: [0, -60] 
    });
  };

  const getStatusInfo = (device: any) => {
    const wl = Number(device.waterLevel || 0);
    const warningThresh = device.warningThreshold ?? 5.0;
    const criticalThresh = device.criticalThreshold ?? 10.0;

    if (wl >= criticalThresh) return { text: 'CRITICAL', color: 'text-red-500' };
    if (wl >= warningThresh) return { text: 'WARNING', color: 'text-orange-500' };
    return { text: 'STABLE', color: 'text-emerald-500' };
  };

  // 🔴 [แก้ Error] เอา Early Return มาไว้ตรงนี้ เพื่อให้ Hook ทุกตัวทำงานเสร็จก่อน
  if (!mounted) {
    return <div className="w-full h-full bg-white/10 dark:bg-black/10 backdrop-blur-md animate-pulse rounded-[2.5rem]"></div>;
  }

  return (
    <MapContainer 
      center={mapCenterAndZoom.center} 
      zoom={mapCenterAndZoom.zoom} 
      className="w-full h-full rounded-[2.5rem] z-0 shadow-inner bg-transparent"
      zoomControl={false} 
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url={tileUrl}
      />
      
      {/* Component ดึงให้แผนที่ขยับตาม */}
      <MapUpdater center={mapCenterAndZoom.center} zoom={mapCenterAndZoom.zoom} />
      
      {devices.map((device, idx) => {
          if (!device.lat || !device.lng) return null; 
          
          const statusInfo = getStatusInfo(device);
          // ทำเครื่องหมายจางลง ถ้าเลือกดูเครื่องอื่นอยู่
          const opacityStyle = (selectedMac !== 'ALL' && selectedMac !== device.mac) ? 0.4 : 1;

          return (
            <Marker 
              key={device.mac || idx} 
              position={[device.lat, device.lng]}
              icon={createCustomIcon(device)}
              opacity={opacityStyle}
            >
              <Popup className="custom-popup" closeButton={false}>
                {/* 🌟 [UI อัปเกรด] Popup เนื้อใส */}
                <div className="text-center p-3 font-sans min-w-[140px] bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-2xl shadow-2xl">
                  <h3 className="font-black text-[11px] text-slate-800 dark:text-white uppercase tracking-widest drop-shadow-sm">{device.name}</h3>
                  <div className="h-px w-full bg-slate-300/50 dark:bg-white/10 my-2"></div>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 font-mono uppercase tracking-widest">{device.mac}</p>
                  <p className={`text-[12px] font-black mt-2 uppercase tracking-widest drop-shadow-md ${statusInfo.color}`}>
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