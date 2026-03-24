import { NextResponse } from "next/server";
// ✅ ถอย 4 ชั้นเพื่อไปหาโฟลเดอร์ db ที่อยู่นอกสุด
import connectMongoDB from "../../../../db/mongodb"; 
import User from "../../../../db/models/User";

// ✅ ฟังก์ชันสำหรับกด "อนุมัติ" (ปรับสถานะเป็น true)
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

// ❌ ฟังก์ชันสำหรับกด "ปฏิเสธ" (ลบข้อมูลผู้ใช้ออก)
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