import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // 🌟 ดึงข้อมูล Role จาก Token
    const userRole = req.nextauth.token?.role;

    // 🌟 ถ้ากำลังเข้าหน้า /admin แต่ Role ไม่ใช่ "admin" (เช่น เป็นแค่ "user")
    if (req.nextUrl.pathname.startsWith("/admin") && userRole !== "admin") {
      // ให้เตะกลับไปหน้าหลัก (หน้า Dashboard สำหรับ User ทั่วไป)
      return NextResponse.redirect(new URL("/", req.url));
    }
  },
  {
    callbacks: {
      // 🌟 ด่านแรก: ต้อง Login ก่อนถึงจะผ่านเข้าไปทำเงื่อนไขด้านบนได้
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  // 🎯 กำหนดว่าจะล็อกหน้าไหนบ้าง (ในที่นี้คือล็อกเฉพาะหน้า /admin และโฟลเดอร์ย่อยทั้งหมดของมัน)
  // ส่วนหน้าแรก (/) จะยังเข้าได้ปกติครับ
  matcher: ["/admin/:path*"], 
};