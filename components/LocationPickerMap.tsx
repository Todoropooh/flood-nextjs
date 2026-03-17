'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useTheme } from 'next-themes';

// 🟢 แก้ปัญหาไอคอนหมุดของ Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// 🟢 ฟังก์ชันดักจับการ "คลิก" บนแผนที่
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// 🟢 ฟังก์ชันช่วยเลื่อนกล้องแผนที่ (Pan) ไปยังจุดที่เรากดตำแหน่งปัจจุบัน
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom()); // บินไปตำแหน่งใหม่แบบนุ่มนวล
  }, [lat, lng, map]);
  return null;
}

export default function LocationPickerMap({ 
  lat, 
  lng, 
  onChange 
}: { 
  lat: number, 
  lng: number, 
  onChange: (lat: number, lng: number) => void 
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [position, setPosition] = useState<[number, number]>([lat, lng]);
  
  // 🌟 ใช้ useRef เพื่อเข้าถึงตัวหมุดเวลาลากเสร็จ
  const markerRef = useRef<L.Marker>(null);

  // อัปเดตหมุดถ้าค่าจากหน้า Admin เปลี่ยน
  useEffect(() => {
    setPosition([lat, lng]);
  }, [lat, lng]);

  const handleLocationSelect = (newLat: number, newLng: number) => {
    setPosition([newLat, newLng]);
    onChange(newLat, newLng); // ส่งพิกัดกลับไปให้ฟอร์มหน้า Admin
  };

  // 🌟 ดักจับอีเวนต์ตอน "ลากหมุด (Drag)" แล้วปล่อย
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newPos = marker.getLatLng();
          handleLocationSelect(newPos.lat, newPos.lng);
        }
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // 🌟 ฟังก์ชันสำหรับดึงพิกัด GPS ปัจจุบัน
  const getCurrentLocation = (e: React.MouseEvent) => {
    e.preventDefault(); // ป้องกันฟอร์มรีเฟรช
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          handleLocationSelect(latitude, longitude);
        },
        (err) => {
          alert("ไม่สามารถดึงตำแหน่งได้ กรุณาเปิด GPS (Location Service) บนอุปกรณ์ของคุณ");
        }
      );
    } else {
      alert("เบราว์เซอร์ของคุณไม่รองรับการหาตำแหน่ง");
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      
      {/* 🌟 ส่วนหัว: แสดงพิกัด และปุ่มใช้ตำแหน่งปัจจุบัน */}
      <div className="flex justify-between items-center">
        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
          📍 {position[0].toFixed(6)}, {position[1].toFixed(6)}
        </span>
        <button
          onClick={getCurrentLocation}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M2 12h2"/><path d="M20 12h2"/></svg>
          ตำแหน่งปัจจุบัน
        </button>
      </div>

      {/* 🌟 ตัวแผนที่ */}
      <div className="h-[250px] w-full relative z-0 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
        <MapContainer 
          center={position} 
          zoom={14} 
          style={{ height: '100%', width: '100%', zIndex: 0 }}
        >
          <TileLayer
            url={isDark 
              ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
              : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"}
          />
          
          {/* 📍 หมุดที่จะขยับตามที่เราคลิก หรือ "ลาก (Draggable)" */}
          <Marker 
            position={position} 
            draggable={true}              // เปิดโหมดให้ลากหมุดได้
            eventHandlers={eventHandlers} // เมื่อลากเสร็จให้เรียกฟังก์ชันอัปเดตค่า
            ref={markerRef}
          />
          
          {/* ตัวดักจับการคลิกบนแผนที่ */}
          <MapClickHandler onLocationSelect={handleLocationSelect} />

          {/* ช่วยเลื่อนกล้องแผนที่อัตโนมัติเวลากดปุ่มหาตำแหน่งปัจจุบัน */}
          <RecenterMap lat={position[0]} lng={position[1]} />
        </MapContainer>
      </div>
      
    </div>
  );
}