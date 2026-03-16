import { NextResponse } from 'next/server';

// 👇 ผมคอมเมนต์ปิดส่วน Database ไว้ก่อน เพื่อดูว่า Route พังไหม
// import connectDB from '@/db/connect';
// import WaterLog from '@/db/models/WaterLog';

export async function GET() {
  return NextResponse.json({ message: "GET works! (Database Disabled)" });
}

export async function POST(req: Request) {
  // รับค่ามา แต่ยังไม่บันทึก
  const body = await req.json();
  console.log("Server ได้รับค่า:", body);
  
  return NextResponse.json({ 
    success: true, 
    message: "POST works! (Database Disabled)",
    received: body 
  });
}