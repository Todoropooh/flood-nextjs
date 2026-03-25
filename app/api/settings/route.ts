import { NextResponse } from 'next/server';
import connectDB from '@/db/connect';
import Device from '@/db/models/Device';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const mac = searchParams.get('mac');

    // 🌟 ถ้าไม่มี MAC (หน้า Admin เรียกดูรายการทั้งหมด)
    if (!mac || mac === 'null' || mac === 'undefined') {
      const devices = await Device.find({}).sort({ createdAt: -1 });
      return NextResponse.json(devices || []); // ส่ง Array เสมอ ห้ามส่ง Object
    }

    // 🌟 ถ้ามี MAC (ESP32 หรือหน้าแก้ไขรายเครื่องเรียก)
    const device = await Device.findOne({ mac });
    if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 });

    return NextResponse.json({
      isActive: device.isActive ?? true,
      isBuzzerEnabled: device.isBuzzerEnabled ?? true,
      systemOn: device.isActive ?? true,
      buzzerOn: device.isBuzzerEnabled ?? true,
      installHeight: device.installHeight || 13.5,
      warningThreshold: device.warningThreshold || 2.8,
      criticalThreshold: device.criticalThreshold || 3.0,
      name: device.name || "Station",
      mac: device.mac
    });
  } catch (error: any) {
    console.error("Settings GET Error:", error.message);
    return NextResponse.json([], { status: 200 }); // พังยังไงก็ส่ง Array ว่างกลับไป หน้าเว็บจะได้ไม่ Error
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