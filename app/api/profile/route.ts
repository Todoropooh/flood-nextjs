import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/db/connect";
import User from "@/db/models/User";
import bcrypt from "bcryptjs"; // 🌟 ใช้เปรียบเทียบรหัสผ่านเดิม

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const data = await request.json();
    const { userId, firstname, lastname, image, currentPassword, newPassword } = data;

    if (!userId) return NextResponse.json({ error: "ไม่พบรหัสผู้ใช้งาน" }, { status: 400 });

    const user = await User.findById(userId);
    if (!user) return NextResponse.json({ error: "ไม่พบบัญชีผู้ใช้ในระบบ" }, { status: 404 });

    // 🔒 ระบบตรวจสอบความปลอดภัยก่อนเปลี่ยนรหัสผ่าน
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: "กรุณากรอกรหัสผ่านปัจจุบันเพื่อยืนยันตัวตน!" }, { status: 400 });
      }
      
      // เอาคำที่พิมพ์มา เทียบกับรหัสที่เข้ารหัสไว้ใน Database
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return NextResponse.json({ error: "❌ รหัสผ่านปัจจุบันไม่ถูกต้อง!" }, { status: 400 });
      }

      // ถ้าถูก ค่อยเข้ารหัส (Hash) รหัสผ่านใหม่ แล้วเซฟทับ
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    // 👤 อัปเดตข้อมูลทั่วไป (เปลี่ยนชื่อ หรือ รูปโปรไฟล์)
    if (firstname) user.firstname = firstname;
    if (lastname) user.lastname = lastname;
    if (image) user.image = image;

    await user.save();

    return NextResponse.json({ success: true, message: "อัปเดตโปรไฟล์เรียบร้อยแล้ว ✅" });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}