import { NextResponse } from "next/server";
// ✅ แก้ไข Path ตรงนี้
import connectMongoDB from "../../../db/mongodb"; 
import User from "../../../db/models/User";
import bcrypt from "bcryptjs"; 

export async function POST(req: Request) {
  try {
    // 🌟 แก้จาก res เป็น req
    const { username, password, firstname, lastname, phone } = await req.json(); 
    await connectMongoDB();

    const userExists = await User.findOne({ username });
    if (userExists) {
      return NextResponse.json({ error: "ชื่อผู้ใช้นี้มีคนใช้แล้ว" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({ 
      username, 
      password: hashedPassword, 
      firstname, 
      lastname, 
      phone,
      role: 'user', 
      isApproved: false 
    });

    return NextResponse.json({ message: "สมัครสมาชิกสำเร็จ" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการสมัครสมาชิก" }, { status: 500 });
  }
}