import { NextResponse } from 'next/server';
import connectDB from '@/db/connect';
import Device from '@/db/models/Device';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // 🌟 ปิดการจำค่าเก่า (Cache) ของ Next.js เด็ดขาด

export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const mac = searchParams.get('mac');

    // กรณีหน้า Admin โหลด
    if (!mac || mac === 'null' || mac === 'undefined') {
      const devices = await Device.find({}).sort({ createdAt: -1 }).lean();
      return NextResponse.json(devices || []); 
    }

    // กรณีบอร์ดหรือหน้า Dashboard โหลด
    const device = await Device.findOne({ mac }).lean();
    if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 });

    // 🌟 ส่งข้อมูล "ทั้งหมด" กลับไปให้หน้าเว็บ (รวมถึง lastPing และ waterLevel)
    return NextResponse.json({
      ...device, // คืนค่าทุกอย่างที่มีใน Database แบบไม่ตกหล่น
      isActive: device.isActive ?? true,
      isBuzzerEnabled: device.isBuzzerEnabled ?? true,
      systemOn: device.isActive ?? true,
      buzzerOn: device.isBuzzerEnabled ?? true,
      installHeight: device.installHeight || 12.6,
      warningThreshold: device.warningThreshold || 2.0,
      criticalThreshold: device.criticalThreshold || 5.0,
      name: device.name || "Station"
    });
  } catch (error: any) {
    return NextResponse.json([], { status: 200 }); 
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const { mac, ...updateData } = body;
    if (!mac) return NextResponse.json({ error: "MAC required" }, { status: 400 });

    const updated = await Device.findOneAndUpdate(
      { mac }, 
      { $set: updateData }, 
      { new: true, upsert: true }
    );
    return NextResponse.json({ success: true, device: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}