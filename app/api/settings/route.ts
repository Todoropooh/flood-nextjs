import { NextResponse } from 'next/server';
import connectDB from '@/db/connect';
import Device from '@/db/models/Device';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await connectDB();
    
    // ดึง MAC Address จาก URL (ที่ ESP32 ส่งมาถาม)
    const { searchParams } = new URL(request.url);
    const mac = searchParams.get('mac');

    if (!mac) return NextResponse.json({ error: 'MAC required' }, { status: 400 });

    // ไปหาข้อมูลอุปกรณ์ตัวนี้ในฐานข้อมูล
    const device = await Device.findOne({ mac });

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    // 🌟 ส่งค่ากลับไปให้บอร์ด (ต้องใช้ชื่อ Key ให้ตรงกับที่ ESP32 รออ่าน)
    return NextResponse.json({
      isActive: device.isActive,           // สถานะเปิด/ปิดระบบ
      isBuzzerEnabled: device.isBuzzerEnabled, // สถานะเปิด/ปิดเสียง
      installHeight: device.installHeight || 13.5,
      warningThreshold: device.warningThreshold || 2.8,
      criticalThreshold: device.criticalThreshold || 3.0
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ส่วน POST ถ้าพี่ใช้หน้า Admin แก้ไขข้อมูลโดยตรงผ่าน API อื่นอยู่แล้ว 
// ไฟล์นี้อาจจะไม่ต้องมี POST ก็ได้ครับ เพราะเราเน้นให้ ESP32 มา GET อย่างเดียว