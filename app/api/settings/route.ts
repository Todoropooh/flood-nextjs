import { NextResponse } from 'next/server';

// สร้างตัวแปรเก็บค่าสวิตช์ไว้ชั่วคราว (เริ่มต้นให้เปิดไว้ทั้งคู่)
let settings = {
  systemOn: true,
  buzzerOn: true
};

// ฝั่งบอร์ด ESP32 จะเข้ามาเรียกใช้ (GET) เพื่อถามสถานะ
export async function GET() {
  return NextResponse.json(settings);
}

// ฝั่งหน้าเว็บจะส่งค่ามา (POST) เมื่อพี่กดสวิตช์
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // อัปเดตค่าตามที่หน้าเว็บส่งมา
    if (body.systemOn !== undefined) settings.systemOn = body.systemOn;
    if (body.buzzerOn !== undefined) settings.buzzerOn = body.buzzerOn;
    
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
}