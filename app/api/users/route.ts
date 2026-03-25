import { NextResponse } from "next/server";
import connectDB from "@/db/connect";
import User from "@/db/models/User";
import * as bcrypt from "bcryptjs";

// 🌟 เพิ่มบรรทัดนี้: บังคับให้ Next.js ดึงข้อมูลสดใหม่เสมอ (ห้าม Cache)
export const dynamic = 'force-dynamic';

// ดึงข้อมูล User ทั้งหมด
export async function GET() {
  try {
    await connectDB();
    const users = await User.find({}).select("-password"); // ไม่ส่งรหัสผ่านกลับไป
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// สร้าง User ใหม่
export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    
    // รับค่า image มาด้วย
    const { username, password, firstname, lastname, role, phone, image } = body;

    if (!username || !password || !firstname || !lastname) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username,
      password: hashedPassword,
      firstname,
      lastname,
      role: role || "user",
      phone: phone || "",
      image: image || "", // บันทึกรูป
      // 💡 ระบบจะใช้ค่า default `isApproved: false` จาก Schema ที่เราแก้ไปเมื่อกี้อัตโนมัติ
    });

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error) {
    console.error("Create User Error:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

// อัปเดตข้อมูล User
export async function PUT(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    
    const { _id, username, password, firstname, lastname, role, phone, image } = body;

    if (!_id) return NextResponse.json({ error: "User ID is required" }, { status: 400 });

    const updateData: any = {
      username,
      firstname,
      lastname,
      role,
      phone,
      image, // อัปเดตรูป
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(_id, updateData, { new: true });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Update User Error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

// ลบ User
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "User ID is required" }, { status: 400 });

    await User.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "User deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}