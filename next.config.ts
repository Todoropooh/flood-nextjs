import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // ปิดการแจ้งเตือน Error ของ TypeScript ตอนเอาขึ้น Vercel
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // ปิดการตรวจระเบียบโค้ดของ ESLint ตอนเอาขึ้น Vercel
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;