import { NextResponse } from 'next/server';
import connectDB from '@/db/connect'; // 🟢 เชื่อมต่อ Database
import Device from '@/db/models/Device';

export const dynamic = 'force-dynamic';

// ==============================
// 🟢 GET: ดึงข้อมูลอุปกรณ์ทั้งหมด
// ==============================
export async function GET() {
  try {
    await connectDB();
    const devices = await Device.find({}).sort({ createdAt: -1 });
    return NextResponse.json(devices);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// ==============================
// 🟢 POST: สร้างอุปกรณ์ใหม่
// ==============================
export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const newDevice = await Device.create({
      name: body.name,
      location: body.location,
      mac: body.mac,
      type: body.type || 'ESP32',
      image: body.image || '', 
      lat: body.lat, // 🟢 เพิ่มบันทึกพิกัดละติจูด
      lng: body.lng, // 🟢 เพิ่มบันทึกพิกัดลองจิจูด
      status: 'Offline'
    });
    return NextResponse.json(newDevice, { status: 201 });
  } catch (error: any) {
    console.error("POST Error:", error.message);
    if (error.code === 11000) return NextResponse.json({ error: 'MAC ซ้ำ' }, { status: 400 });
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
    
    // แยก _id ออกมา แล้วเอาข้อมูลที่เหลือไปอัปเดต
    const { _id, ...updateData } = body;
    
    if (!_id) {
      return NextResponse.json({ error: 'ไม่พบ ID ของอุปกรณ์' }, { status: 400 });
    }

    // สั่งหาด้วย ID แล้วอัปเดตข้อมูลทับ
    const updatedDevice = await Device.findByIdAndUpdate(_id, updateData, { new: true });

    if (!updatedDevice) {
      return NextResponse.json({ error: 'ไม่พบอุปกรณ์ในระบบ' }, { status: 404 });
    }

    return NextResponse.json(updatedDevice, { status: 200 });
  } catch (error: any) {
    console.error("PUT Error:", error.message);
    if (error.code === 11000) return NextResponse.json({ error: 'MAC ซ้ำ' }, { status: 400 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
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
    await Device.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}