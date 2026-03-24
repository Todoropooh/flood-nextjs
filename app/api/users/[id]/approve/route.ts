import { NextResponse } from "next/navigation";
import connectMongoDB from "@/db/mongodb";
import User from "@/db/models/User";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectMongoDB();
    const { id } = params;

    // อัปเดตให้เป็น Approved และตั้ง Role เป็น user (หรือตามต้องการ)
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
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการอนุมัติ" }, { status: 500 });
  }
}

// แถม: ฟังก์ชันปฏิเสธ (ลบทิ้ง)
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectMongoDB();
    await User.findByIdAndDelete(params.id);
    return NextResponse.json({ message: "ปฏิเสธและลบข้อมูลสำเร็จ ❌" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}