import { NextResponse } from 'next/server';
import connectDB from '@/db/connect';
import Device from '@/db/models/Device';

export const dynamic = 'force-dynamic';

/**
 * 📥 [GET] ดึงข้อมูลการตั้งค่า
 * - ถ้าไม่ส่ง mac: ส่งรายชื่ออุปกรณ์ทั้งหมด (สำหรับหน้า Admin)
 * - ถ้าส่ง ?mac=...: ส่งค่าตั้งค่าเฉพาะเครื่อง (สำหรับ ESP32)
 */
export async function GET(request: Request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const mac = searchParams.get('mac');

    // 🌟 1. กรณีหน้า Admin โหลดรายการอุปกรณ์ (ไม่มี MAC)
    if (!mac) {
      const devices = await Device.find({}).sort({ createdAt: -1 });
      // ส่งกลับเป็น Array เพื่อให้หน้าเว็บใช้ .map() ได้ ไม่พัง
      return NextResponse.json(devices); 
    }

    // 🌟 2. กรณี ESP32 หรือหน้าแก้ไขเฉพาะเครื่อง (มี MAC)
    const device = await Device.findOne({ mac });

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    // ส่ง Object ข้อมูลเครื่องกลับไป
    return NextResponse.json({
      isActive: device.isActive,
      isBuzzerEnabled: device.isBuzzerEnabled,
      // Mapping ชื่อตัวแปรเผื่อไว้ทั้ง 2 ระบบ
      systemOn: device.isActive,
      buzzerOn: device.isBuzzerEnabled,
      installHeight: device.installHeight || 13.5,
      warningThreshold: device.warningThreshold || 2.8,
      criticalThreshold: device.criticalThreshold || 3.0,
      name: device.name || "Station",
      mac: device.mac
    });

  } catch (error: any) {
    console.error("❌ SETTINGS GET ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * 📤 [POST] อัปเดตการตั้งค่าจากหน้า Dashboard / Admin
 */
export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const { mac, isActive, isBuzzerEnabled, systemOn, buzzerOn, installHeight, warningThreshold, criticalThreshold } = body;

    if (!mac) {
      return NextResponse.json({ error: "MAC address is required" }, { status: 400 });
    }

    // เตรียมข้อมูลสำหรับอัปเดต (รองรับชื่อตัวแปรทั้งแบบเก่าและใหม่)
    const updateData: any = {};
    
    if (isActive !== undefined) updateData.isActive = isActive;
    else if (systemOn !== undefined) updateData.isActive = systemOn;

    if (isBuzzerEnabled !== undefined) updateData.isBuzzerEnabled = isBuzzerEnabled;
    else if (buzzerOn !== undefined) updateData.isBuzzerEnabled = buzzerOn;

    if (installHeight !== undefined) updateData.installHeight = Number(installHeight);
    if (warningThreshold !== undefined) updateData.warningThreshold = Number(warningThreshold);
    if (criticalThreshold !== undefined) updateData.criticalThreshold = Number(criticalThreshold);

    const updatedDevice = await Device.findOneAndUpdate(
      { mac },
      { $set: updateData },
      { new: true } // คืนค่าข้อมูลที่อัปเดตแล้วกลับมา
    );

    if (!updatedDevice) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, device: updatedDevice });

  } catch (error: any) {
    console.error("❌ SETTINGS POST ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}