'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
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

  // อัปเดตหมุดถ้าค่าจากหน้า Admin เปลี่ยน
  useEffect(() => {
    setPosition([lat, lng]);
  }, [lat, lng]);

  const handleLocationSelect = (newLat: number, newLng: number) => {
    setPosition([newLat, newLng]);
    onChange(newLat, newLng); // ส่งพิกัดกลับไปให้ฟอร์มหน้า Admin
  };

  return (
    <MapContainer 
      center={position} 
      zoom={14} 
      style={{ height: '100%', width: '100%', borderRadius: '0.75rem', zIndex: 0 }}
    >
      <TileLayer
        url={isDark 
          ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
          : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"}
      />
      
      {/* 📍 หมุดที่จะขยับตามที่เราคลิก */}
      <Marker position={position} />
      
      {/* ตัวดักจับการคลิก */}
      <MapClickHandler onLocationSelect={handleLocationSelect} />
    </MapContainer>
  );
}