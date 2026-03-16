import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/db/connect'; // ปรับ path ตามของคุณ
import User from '@/db/models/User';   // ปรับ path ตามของคุณ
import jwt from 'jsonwebtoken';         // ต้องลง: npm install jsonwebtoken @types/jsonwebtoken
import bcrypt from 'bcryptjs';          // ต้องลง: npm install bcryptjs @types/bcryptjs

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { username, password } = await request.json();

    // 1. ค้นหา User
    const user = await User.findOne({ username });
    if (!user) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้งานนี้' }, { status: 401 });
    }

    // 2. เช็ครหัสผ่าน (เทียบค่าที่ Hash ไว้)
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return NextResponse.json({ error: 'รหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    // 3. สร้าง JWT Token (ใส่ ID และ Role ลงไปด้วยตาม Diagram)
    const token = jwt.sign(
      { userId: user._id, role: user.role }, 
      process.env.JWT_SECRET!,
      { expiresIn: '1d' } // อายุ 1 วัน
    );

    // 4. ส่งกลับไปพร้อมกับตั้งค่า Cookie (เพื่อให้ Browser จำได้)
    const response = NextResponse.json({ 
      message: 'เข้าสู่ระบบสำเร็จ',
      role: user.role 
    });

    response.cookies.set('token', token, {
      httpOnly: true, // ป้องกัน XSS (แฮกเกอร์ขโมย token ผ่านสคริปต์ไม่ได้)
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 วัน
      path: '/',
    });

    return response;

  } catch (error: any) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}