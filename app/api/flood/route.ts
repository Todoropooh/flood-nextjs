import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/db/connect";
import WaterLog from "@/db/models/WaterLog";
import Device from "@/db/models/Device";

// 🌟 1. ฟังก์ชันส่ง LINE Messaging API (Push Message)
async function sendLineMessage(message: string) {
  // Token และ User ID ที่คุณให้มา (ใส่ไว้ให้พร้อมใช้งาน)
  const ACCESS_TOKEN = "JSP4AFcQD0fSIwxGBIQXT+W2h/sD3wcdPUaLPu5I4znODmfu9l1qLVMgP328d/CZbBD8vRxfgv0LMwtc5Hn3MnQEovNDRLejZJ/VstvpNgfi98Kv/RXYQUQMbgg4TEbDeii03sBTNE4L9hkwS7tV/wdB04t89/1O/w1cDnyilFU="; 
  const USER_ID = "Ub9d815d4781936f90560a1c8f243d859"; 

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: USER_ID,
        messages: [{ type: "text", text: message }]
      }),
    });

    const data = await response.json();
    console.log("LINE API Status:", response.status, data);

    if (response.ok) {
      console.log("✅ [LINE] ส่งข้อความสำเร็จ!");
    }
  } catch (error) {
    console.error("❌ [LINE] เกิดข้อผิดพลาด:", error);
  }
}

// 🌟 2. POST: รับข้อมูลจากบอร์ด ESP32 / Postman
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json(); 
    await connectDB();

    // 🔍 จัดการเรื่องชื่อฟิลด์ความชื้นให้ตรงกับ Database (air_humidity)
    const currentHumid = payload.humid !== undefined ? payload.humid : (payload.humidity || 0);

    // ก) บันทึกลงตาราง WaterLog (เก็บประวัติ)
    const newLog = await WaterLog.create({
      mac: payload.mac,
      level: payload.level || 0,
      temperature: payload.temp || 0,
      air_humidity: currentHumid, // ใช้ชื่อตามที่ Database ต้องการ
      status: 'Normal'
    });

    // ข) อัปเดตข้อมูลล่าสุดลงในตาราง Device
    const device = await Device.findOneAndUpdate(
      { mac: payload.mac },
      { 
        waterLevel: payload.level || 0,
        temperature: payload.temp || 0,
        humidity: currentHumid,
        updatedAt: new Date()
      },
      { new: true } // เพื่อเอาเกณฑ์ Threshold มาเช็ค
    );

    // ค) 🚨 เช็คสถานะวิกฤต (Critical Alert)
    if (device) {
      const currentLevel = payload.level || 0;
      const criticalLimit = device.criticalThreshold || 7.0;

      if (currentLevel >= criticalLimit) {
        // สร้างข้อความแจ้งเตือน (ส่งแบบภาษาไทยได้แล้วเพราะเราแก้ที่ Header เรียบร้อย)
        const alertMsg = `⚠️ แจ้งเตือนระดับน้ำวิกฤต!\n📍 สถานี: ${device.name}\n🌊 ระดับน้ำ: ${currentLevel.toFixed(1)} cm\n🌡️ อุณหภูมิ: ${Number(payload.temp).toFixed(1)}°C\n📢 โปรดตรวจสอบพื้นที่โดยด่วน!`;
        
        await sendLineMessage(alertMsg);
        
        // อัปเดตสถานะใน Log เป็นวิกฤต
        newLog.status = 'Critical';
        await newLog.save();
      } else if (currentLevel >= (device.warningThreshold || 3.0)) {
        newLog.status = 'Warning';
        await newLog.save();
      }
    }

    return NextResponse.json({ success: true, data: newLog });
  } catch (error: any) {
    console.error("POST Error Details:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 🌟 3. GET: สำหรับดึงข้อมูลกราฟ Analytics
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || 'day';

    let startDate = new Date();
    if (timeframe === 'day') startDate.setHours(startDate.getHours() - 24);
    else if (timeframe === 'week') startDate.setDate(startDate.getDate() - 7);
    else if (timeframe === 'month') startDate.setMonth(startDate.getMonth() - 1);
    else if (timeframe === 'year') startDate.setFullYear(startDate.getFullYear() - 1);

    const logs = await WaterLog.find({
      createdAt: { $gte: startDate }
    }).sort({ createdAt: 1 });

    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}