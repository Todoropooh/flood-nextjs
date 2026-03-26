import { NextResponse } from 'next/server';
import connectDB from '@/db/connect';
import Device from '@/db/models/Device';

export const dynamic = 'force-dynamic';
export const revalidate = 0; 

export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const mac = searchParams.get('mac');

    // กรณีหน้า Admin โหลด (ดึงทุกเครื่อง)
    if (!mac || mac === 'null' || mac === 'undefined') {
      const devices = await Device.find({}).sort({ createdAt: -1 }).lean();
      return NextResponse.json(devices || []); 
    }

    // กรณีบอร์ดหรือหน้า Dashboard โหลด (ดึงรายเครื่อง)
    const device = await Device.findOne({ mac }).lean();
    if (!device) return NextResponse.json({ error: 'Device not found' }, { status: 404 });

    // 🌟 ดึงข้อมูลมาจับคู่ส่งให้บอร์ด ESP32
    return NextResponse.json({
      mac: device.mac,
      name: device.name || "Station",
      isActive: device.isActive ?? true,
      isBuzzerEnabled: device.isBuzzerEnabled ?? true,
      systemOn: device.isActive ?? true,    
      buzzerOn: device.isBuzzerEnabled ?? true, 
      isSmsEnabled: device.isSmsEnabled ?? false, // 🚨 [แก้ตรงนี้!] เพิ่มสวิตช์ SMS ส่งให้บอร์ด
      installHeight: device.installHeight || 12.6,
      warningThreshold: device.warningThreshold || 2.0,
      criticalThreshold: device.criticalThreshold || 5.0,
      waterLevel: device.waterLevel || 0,
      lastPing: device.lastPing || new Date(),
      status: device.status || "STABLE",
      phoneNumber: device.phoneNumber || "" // 📱 ส่งเบอร์โทรศัพท์ไปให้บอร์ด
    });

  } catch (error: any) {
    // 🌟 ดักไว้เผื่อพัง: ถ้ามี Error ให้ส่ง Default กลับไป บอร์ดจะได้ไม่หลับ!
    return NextResponse.json({ 
      isActive: true, 
      systemOn: true,
      isBuzzerEnabled: true,
      buzzerOn: true,
      isSmsEnabled: false, // 🚨 [แก้ตรงนี้!] กันเหนียวกรณีฐานข้อมูลล่ม
      phoneNumber: "" 
    }, { status: 200 }); 
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const { mac, ...updateData } = body;
    
    if (!mac) return NextResponse.json({ error: "MAC required" }, { status: 400 });

    // 🌟 บันทึกข้อมูลลง DB
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