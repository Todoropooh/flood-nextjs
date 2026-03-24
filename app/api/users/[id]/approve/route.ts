import { NextResponse } from "next/server";
// ✅ ถอย 4 ชั้นเพื่อออกไปหาโฟลเดอร์ db นอก app
import connectMongoDB from "../../../../db/mongodb"; 
import User from "../../../../db/models/User";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectMongoDB();
    const { id } = params;

    // อัปเดตสถานะเป็น Approved
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
    console.error("Approve Error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการอนุมัติ" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectMongoDB();
    const { id } = params;
    
    // ปฏิเสธการสมัคร (ลบ User ทิ้ง)
    await User.findByIdAndDelete(id);
    
    return NextResponse.json({ message: "ปฏิเสธและลบข้อมูลสำเร็จ ❌" }, { status: 200 });
  } catch (error) {
    console.error("Reject Error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการลบข้อมูล" }, { status: 500 });
  }
}