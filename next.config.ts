import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // ✅ ปิดการแจ้งเตือน Error ของ TypeScript ตอน Build
  typescript: {
    ignoreBuildErrors: true,
  },

  // ✅ ปิดการตรวจ ESLint ตอน Build (แก้ให้รองรับ Next.js เวอร์ชันล่าสุด)
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // ✅ เพิ่มเติม: ป้องกันปัญหาเรื่องเครื่องหมาย / ท้าย URL (ถ้ามี)
  trailingSlash: false,
};

export default nextConfig;