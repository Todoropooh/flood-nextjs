import { NextResponse } from "next/server";
import connectDB from "@/db/connect"; 
import User from "@/db/models/User"; 
import bcrypt from "bcryptjs"; 

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    
    // 💡 1. ดึงข้อมูลมาให้ครบตามหน้า Frontend (เพิ่ม email เข้ามา)
    const { username, password, firstname, lastname, email, phone } = body;

    // 💡 2. ดักข้อมูลว่าง (Validation เบื้องต้น)
    if (!username || !password || !firstname) {
      return NextResponse.json({ error: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน" }, { status: 400 });
    }

    // 3. เช็คว่ามีคนใช้ Username นี้หรือยัง
    const userExists = await User.findOne({ username });
    if (userExists) {
      return NextResponse.json({ error: "ชื่อผู้ใช้นี้มีคนใช้แล้ว" }, { status: 400 });
    }

    // 4. เข้ารหัสรหัสผ่าน
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 🌟 5. บันทึกลงฐานข้อมูล โดยล็อก isApproved ไว้ที่ false
    await User.create({ 
      username, 
      password: hashedPassword, 
      firstname, 
      lastname, 
      email, // 👈 เพิ่มลงฐานข้อมูล
      phone, 
      role: 'user', 
      isApproved: false // 👈 สำคัญมาก! ต้องให้ Admin กดอนุมัติก่อนถึงจะเข้าได้
    });

    return NextResponse.json({ message: "สมัครสำเร็จ! กรุณารอ Admin อนุมัติการเข้าใช้งาน" }, { status: 201 });
    
  } catch (error: any) {
    console.error("Register Error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการสมัครสมาชิก" }, { status: 500 });
  }
}