import { NextResponse } from "next/server";
// 🌟 ใช้ @/ เช่นกันครับ เพื่อความสม่ำเสมอ
import connectMongoDB from "@/db/mongodb"; 
import User from "@/db/models/User";

// ✅ ฟังก์ชันสำหรับกด "อนุมัติ" (Status -> true)
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectMongoDB();
    const { id } = params;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { isApproved: true },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้งาน" }, { status: 404 });
    }

    return NextResponse.json({ message: "อนุมัติผู้ใช้งานสำเร็จ ✅" }, { status: 200 });
  } catch (error) {
    console.error("Approve API Error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการอนุมัติ" }, { status: 500 });
  }
}

// ❌ ฟังก์ชันสำหรับกด "ปฏิเสธ" (ลบ User ทิ้ง)
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectMongoDB();
    const { id } = params;
    
    await User.findByIdAndDelete(id);
    
    return NextResponse.json({ message: "ปฏิเสธการสมัครสำเร็จ ❌" }, { status: 200 });
  } catch (error) {
    console.error("Delete API Error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการลบข้อมูล" }, { status: 500 });
  }
}