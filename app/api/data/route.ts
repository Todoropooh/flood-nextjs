import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/db/connect';
import WaterLog from '@/db/models/WaterLog';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // 1. รับข้อมูล JSON จาก ESP32
    const payload = await request.json(); 
    
    // 2. คำนวณสถานะอัตโนมัติจากระดับน้ำ (เอาไว้โชว์ในเล่มบทที่ 3-4)
    let currentStatus = 'Normal';
    if (payload.level > 80) {
      currentStatus = 'Critical';
    } else if (payload.level > 50) {
      currentStatus = 'Warning';
    }

    // 3. บันทึกลง MongoDB ตามโมเดลที่คุณมี
    const newEntry = await WaterLog.create({
      level: payload.level,
      temperature: payload.temperature || 0,
      humidity: payload.humidity || 0, // ชื่อเดียวกับใน models/WaterLog.ts
      status: currentStatus,
      createdAt: new Date()
    });

    return NextResponse.json({ 
      message: 'Data logged successfully', 
      data: newEntry 
    }, { status: 201 });

  } catch (error: any) {
    console.error("API Data Error:", error);
    return NextResponse.json({ 
      error: 'Failed to log data', 
      details: error.message 
    }, { status: 500 });
  }
}