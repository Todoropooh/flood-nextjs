import { NextResponse } from 'next/server';
import connectDB from '@/db/connect';
import Device from '@/db/models/Device';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const mac = searchParams.get('mac');

    // 💡 แก้ปัญหา 400 Bad Request: ถ้าไม่มี MAC (เช่น หน้าเว็บเรียก) ให้ส่งค่า Default กลับไป
    if (!mac) {
      return NextResponse.json({
        isActive: true,
        isBuzzerEnabled: true,
        systemOn: true,      // เผื่อโค้ดหน้าเว็บดึงชื่อนี้
        buzzerOn: true,      // เผื่อโค้ดหน้าเว็บดึงชื่อนี้
        installHeight: 13.5,
        warningThreshold: 2.8,
        criticalThreshold: 3.0,
        note: "Default settings sent because MAC is missing"
      });
    }

    // ไปหาข้อมูลอุปกรณ์ตาม MAC Address
    const device = await Device.findOne({ mac });

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    // 🌟 ส่งค่ากลับไป (รองรับทั้งบอร์ด ESP32 และหน้า Dashboard)
    return NextResponse.json({
      isActive: device.isActive,
      isBuzzerEnabled: device.isBuzzerEnabled,
      systemOn: device.isActive,       // Mapping ค่าให้ตรงกับที่หน้าเว็บอาจจะเรียกใช้
      buzzerOn: device.isBuzzerEnabled, // Mapping ค่าให้ตรงกับที่หน้าเว็บอาจจะเรียกใช้
      installHeight: device.installHeight || 13.5,
      warningThreshold: device.warningThreshold || 2.8,
      criticalThreshold: device.criticalThreshold || 3.0
    });

  } catch (error: any) {
    console.error("❌ SETTINGS API ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 📝 ส่วน POST (กรณีต้องการอัปเดตสถานะจากหน้า Dashboard ผ่าน API นี้โดยตรง)
export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const { mac, isActive, isBuzzerEnabled, systemOn, buzzerOn } = body;

    if (!mac) return NextResponse.json({ error: "MAC required" }, { status: 400 });

    // อัปเดตข้อมูล (รองรับชื่อตัวแปรทั้ง 2 แบบ)
    const updateData: any = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    else if (systemOn !== undefined) updateData.isActive = systemOn;

    if (isBuzzerEnabled !== undefined) updateData.isBuzzerEnabled = isBuzzerEnabled;
    else if (buzzerOn !== undefined) updateData.isBuzzerEnabled = buzzerOn;

    const updatedDevice = await Device.findOneAndUpdate(
      { mac },
      { $set: updateData },
      { new: true }
    );

    return NextResponse.json({ success: true, device: updatedDevice });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}