import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/db/connect';
import WaterLog from '@/db/models/WaterLog';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // 1. รับข้อมูล JSON จาก ESP32
    const payload = await request.json(); 
    
    // 2. คำนวณสถานะอัตโนมัติจากระดับน้ำ (บังคับให้เป็น Number ป้องกัน Error)
    let currentStatus = 'Normal';
    if (Number(payload.level) > 80) {
      currentStatus = 'Critical';
    } else if (Number(payload.level) > 50) {
      currentStatus = 'Warning';
    }

    // 3. บันทึกลง MongoDB 
    // 👇 แก้ชื่อเป็น air_humidity ให้ตรงกับ Model แล้วครับ!
    const newEntry = await WaterLog.create({
      level: Number(payload.level),
      temperature: Number(payload.temperature || 0),
      air_humidity: Number(payload.humidity || 0), // รับค่า humidity จาก ESP32 มาใส่ในช่อง air_humidity
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