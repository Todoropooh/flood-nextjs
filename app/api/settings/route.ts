import { NextResponse } from "next/server";
// 🌟 อ้างอิงตามตัวอย่างของพี่เป๊ะๆ
import connectDB from "@/db/connect"; 
import User from "@/db/models/User";

// ✅ อนุมัติสมาชิก
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const { id } = params;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { isApproved: true },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้งาน" }, { status: 404 });
    }

    return NextResponse.json({ message: "อนุมัติผู้ใช้งานสำเร็จ ✅" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ❌ ปฏิเสธสมาชิก (ลบทิ้ง)
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const { id } = params;
    
    await User.findByIdAndDelete(id);
    
    return NextResponse.json({ message: "ปฏิเสธการสมัครสำเร็จ ❌" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}