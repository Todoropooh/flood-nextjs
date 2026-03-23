import { NextResponse } from 'next/server';
import connectDB from '@/db/connect'; 
import Device from '@/db/models/Device';

export const dynamic = 'force-dynamic';

// ==============================
// 🟢 GET: ดึงข้อมูลอุปกรณ์
// ==============================
export async function GET(req: Request) {
  try {
    await connectDB();
    
    // 🌟 เพิ่มระบบดึงข้อมูลรายตัวด้วย MAC (สำหรับ ESP32 มาเรียกเอาค่าไปใช้)
    const { searchParams } = new URL(req.url);
    const mac = searchParams.get('mac');

    if (mac) {
      const device = await Device.findOne({ mac: mac });
      if (device) return NextResponse.json(device);
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    // ถ้าไม่มี MAC ให้ส่งข้อมูลทั้งหมด (สำหรับหน้า Admin)
    const devices = await Device.find({}).sort({ createdAt: -1 });
    return NextResponse.json(devices);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 });
  }
}

// ==============================
// 🟢 POST: สร้างอุปกรณ์ใหม่
// ==============================
export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    // 🌟 เพิ่ม installHeight เข้าไปในการบันทึกข้อมูลใหม่
    const newDevice = await Device.create({
      name: body.name,
      mac: body.mac,
      location: body.location || '',
      type: body.type || 'ESP32',
      image: body.image || '', 
      lat: body.lat || 14.8824,
      lng: body.lng || 103.4936,
      installHeight: body.installHeight || 62.0, // 🌟 เพิ่มตรงนี้
      warningThreshold: body.warningThreshold || 5.0,
      criticalThreshold: body.criticalThreshold || 10.0,
      isActive: body.isActive !== undefined ? body.isActive : true,
      isBuzzerEnabled: body.isBuzzerEnabled !== undefined ? body.isBuzzerEnabled : true,
      status: 'Offline'
    });

    return NextResponse.json(newDevice, { status: 201 });
  } catch (error: any) {
    console.error("POST Error:", error.message);
    if (error.code === 11000) return NextResponse.json({ error: 'MAC Address นี้มีในระบบแล้ว' }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==============================
// 🟢 PUT: แก้ไข/อัปเดตข้อมูลอุปกรณ์
// ==============================
export async function PUT(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    
    const { _id, ...updateData } = body;
    
    if (!_id) {
      return NextResponse.json({ error: 'ไม่พบ ID ของอุปกรณ์' }, { status: 400 });
    }

    // 🌟 ตรงนี้ดีอยู่แล้วครับ $set: updateData จะเหมาเอาทุกอย่างในฟอร์ม 
    // (รวมถึง installHeight ที่เราส่งมาใหม่) ไปอัปเดตลง DB ทันที
    const updatedDevice = await Device.findByIdAndUpdate(
      _id, 
      { $set: updateData }, 
      { new: true, runValidators: true }
    );

    if (!updatedDevice) {
      return NextResponse.json({ error: 'ไม่พบอุปกรณ์ในระบบ' }, { status: 404 });
    }

    console.log("✅ Updated Device:", updatedDevice.name, "H:", updatedDevice.installHeight);
    return NextResponse.json(updatedDevice, { status: 200 });
  } catch (error: any) {
    console.error("PUT Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==============================
// 🟢 DELETE: ลบอุปกรณ์
// ==============================
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    
    await Device.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Deleted Successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}