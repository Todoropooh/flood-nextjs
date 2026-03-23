import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/db/connect';
import WaterLog from '@/db/models/WaterLog';
import Device from '@/db/models/Device'; // 🌟 ดึง Model Device มาใช้ด้วย

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // 1. รับข้อมูล JSON จาก ESP32
    const payload = await request.json(); 
    
    // 🌟 2. ค้นหาอุปกรณ์เพื่อเอาค่าที่ตั้งไว้ (Install Height, Warning, Critical)
    const deviceMac = payload.mac || payload.device_id;
    let h = 13.5;
    let warnLimit = 2.8;
    let critLimit = 3.0;

    if (deviceMac) {
      const device = await Device.findOne({ mac: deviceMac });
      if (device) {
        h = device.installHeight ?? 13.5;
        warnLimit = device.warningThreshold ?? 2.8;
        critLimit = device.criticalThreshold ?? 3.0;
      }
    }

    // 🌟 3. คำนวณระดับน้ำจริงและสถานะ (Logic 13.5 cm)
    const rawDist = Number(payload.level || 0);
    let waterLevel = (h - rawDist);
    
    // กรอง Noise
    if (rawDist >= (h - 0.1)) waterLevel = 0;
    if (waterLevel < 0) waterLevel = 0;
    if (waterLevel > h) waterLevel = h;

    // เช็คเกณฑ์แจ้งเตือน (พร้อม Tolerance 0.05 mm)
    const tolerance = 0.05;
    let currentStatus = 'STABLE';
    if (waterLevel >= (critLimit - tolerance)) {
      currentStatus = 'CRITICAL';
    } else if (waterLevel >= (warnLimit - tolerance)) {
      currentStatus = 'WARNING';
    }

    // 4. บันทึกลง MongoDB 
    const newEntry = await WaterLog.create({
      mac: deviceMac, // บันทึก MAC Address ลงไปด้วยเพื่อแยกอุปกรณ์
      level: rawDist, // บันทึกระยะห่างดิบ
      temperature: Number(payload.temperature || 0),
      air_humidity: Number(payload.humidity || 0), 
      status: currentStatus, // 🌟 บันทึกสถานะที่คำนวณถูกต้องแล้ว
      createdAt: new Date()
    });

    // 5. (Optional) อัปเดตสถานะล่าสุดในหน้า Admin ด้วย
    if (deviceMac) {
      await Device.findOneAndUpdate(
        { mac: deviceMac },
        { waterLevel: rawDist, status: currentStatus, lastPing: new Date() }
      );
    }

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