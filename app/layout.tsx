import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider"; 
import AuthProvider from "@/components/AuthProvider"; // 🌟 1. นำเข้า AuthProvider

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* 🌟 2. ห่อระบบทั้งหมดด้วย AuthProvider เพื่อให้ทุกหน้าใช้ useSession ได้ */}
        <AuthProvider>
          {/* ห่อด้วย ThemeProvider เพื่อให้เรียกใช้ useTheme() ในหน้า Page ได้ */}
          <ThemeProvider 
            attribute="class" 
            defaultTheme="system" 
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}