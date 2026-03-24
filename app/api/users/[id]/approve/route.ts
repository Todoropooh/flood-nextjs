import { NextResponse } from "next/server";
import connectDB from "@/db/connect"; 
import User from "@/db/models/User";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const { id } = params;
    const updatedUser = await User.findByIdAndUpdate(id, { isApproved: true }, { new: true });
    if (!updatedUser) return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
    return NextResponse.json({ message: "อนุมัติสำเร็จ ✅" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    await User.findByIdAndDelete(params.id);
    return NextResponse.json({ message: "ลบสำเร็จ ❌" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}