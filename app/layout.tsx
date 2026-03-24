import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider"; 
import AuthProvider from "@/components/AuthProvider"; 
import Navbar from "@/components/Navbar"; // 🌟 1. นำเข้า Navbar มาบ้านใหม่ที่นี่

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FloodAnalytics Pro",
  description: "Advanced Flood Monitoring Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <ThemeProvider 
            attribute="class" 
            defaultTheme="system" 
            enableSystem
            disableTransitionOnChange
          >
            {/* 🌟 2. วาง Navbar ไว้ที่นี่ เพื่อให้โผล่ทุกหน้าและใช้ Theme/Auth ได้ */}
            <Navbar /> 

            {/* ส่วนของเนื้อหาแต่ละหน้า */}
            {children}
            
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}