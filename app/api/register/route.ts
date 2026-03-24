import { NextResponse } from "next/server";
// 🌟 ใช้ @/ ตาม tsconfig.json ของพี่ ชัวร์ที่สุดครับ
import connectMongoDB from "@/db/mongodb"; 
import User from "@/db/models/User";
import bcrypt from "bcryptjs"; 

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password, firstname, lastname, phone } = body;
    
    await connectMongoDB();

    // 1. เช็กว่ามี Username นี้หรือยัง
    const userExists = await User.findOne({ username });
    if (userExists) {
      return NextResponse.json({ error: "ชื่อผู้ใช้นี้มีคนใช้แล้ว" }, { status: 400 });
    }

    // 2. แฮชรหัสผ่านเพื่อความปลอดภัย
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. สร้าง User ใหม่ (รอ Admin อนุมัติ)
    await User.create({ 
      username, 
      password: hashedPassword, 
      firstname, 
      lastname, 
      phone,
      role: 'user', 
      isApproved: false 
    });

    return NextResponse.json({ message: "สมัครสมาชิกสำเร็จ! กรุณารอ Admin อนุมัติ" }, { status: 201 });
  } catch (error) {
    console.error("Register API Error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการสมัครสมาชิก" }, { status: 500 });
  }
}