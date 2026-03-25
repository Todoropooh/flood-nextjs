import { NextResponse } from "next/server";
import connectDB from "@/db/connect"; 
import User from "@/db/models/User";

// 💡 อัปเดต Type ของ params ให้เป็น Promise
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    
    // 💡 สำคัญ: ต้องใส่ await ก่อนดึง id ออกมา
    const { id } = await params;
    
    const updatedUser = await User.findByIdAndUpdate(id, { isApproved: true }, { new: true });
    if (!updatedUser) return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
    
    return NextResponse.json({ success: true, message: "อนุมัติสำเร็จ ✅" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    
    // 💡 ใส่ await ตรงนี้ด้วยเช่นกันครับ
    const { id } = await params;
    
    const deletedUser = await User.findByIdAndDelete(id);
    
    // 💡 เพิ่มการดักจับกรณีหา User ไม่เจอตอนจะลบ
    if (!deletedUser) return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
    
    return NextResponse.json({ success: true, message: "ลบข้อมูลสำเร็จ ❌" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}