import { NextResponse } from "next/server";
import connectDB from "@/db/connect"; 
import User from "@/db/models/User"; 
import bcrypt from "bcryptjs"; 

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { username, password, firstname, lastname, phone } = body;
    const userExists = await User.findOne({ username });
    if (userExists) return NextResponse.json({ error: "ชื่อผู้ใช้นี้มีคนใช้แล้ว" }, { status: 400 });
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ username, password: hashedPassword, firstname, lastname, phone, role: 'user', isApproved: false });
    return NextResponse.json({ message: "สมัครสมาชิกสำเร็จ! กรุณารอ Admin อนุมัติ" }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}