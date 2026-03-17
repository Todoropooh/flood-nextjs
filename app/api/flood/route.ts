import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/db/connect";
import WaterLog from "@/db/models/WaterLog";
import Device from "@/db/models/Device";

// ✨ ปิดระบบ Cache ของ Vercel เพื่อให้หน้าเว็บดึงข้อมูลสดใหม่เสมอเวลากดรีเฟรช!
export const dynamic = 'force-dynamic';

// 🌟 1. ฟังก์ชันส่ง LINE Messaging API
async function sendLineMessage(message: string) {
  const ACCESS_TOKEN = "JSP4AFcQD0fSIwxGBIQXT+W2h/sD3wcdPUaLPu5I4znODmfu9l1qLVMgP328d/CZbBD8vRxfgv0LMwtc5Hn3MnQEovNDRLejZJ/VstvpNgfi98Kv/RXYQUQMbgg4TEbDeii03sBTNE4L9hkwS7tV/wdB04t89/1O/w1cDnyilFU="; 
  const USER_ID = "Ub9d815d4781936f90560a1c8f243d859"; 

  try {
    await fetch('https://api.line.me/v2/bot/message/push', {
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
  } catch (error) {
    console.error("❌ [LINE] Error:", error);
  }
}

// 🌟 2. POST: รับข้อมูลจากบอร์ด และส่งคำสั่ง Remote กลับไป
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json(); 
    await connectDB();

    // ✨ แก้ไขการดึงข้อมูล: รองรับทั้งชื่อตัวแปรเก่าและใหม่ที่ ESP32 ส่งมา
    const currentLevel = payload.level !== undefined ? payload.level : (payload.water_level || 0);
    const currentTemp = payload.temperature !== undefined ? payload.temperature : (payload.temp || 0);
    const currentHumid = payload.air_humidity !== undefined ? payload.air_humidity : (payload.humid || payload.humidity || 0);

    // ก) อัปเดตข้อมูลลงตาราง Device และดึงค่าการตั้งค่าล่าสุดมาด้วย
    const device = await Device.findOneAndUpdate(
      { mac: payload.mac },
      { 
        waterLevel: currentLevel,
        temperature: currentTemp,    // ใช้ตัวแปรที่ดึงมาใหม่
        humidity: currentHumid,      // ใช้ตัวแปรที่ดึงมาใหม่
        lastPing: new Date() 
      },
      { new: true, upsert: false } 
    );

    // ถ้าไม่เจออุปกรณ์ในระบบ ให้แจ้ง Error
    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    // ข) บันทึกประวัติลงตาราง WaterLog
    const newLog = await WaterLog.create({
      mac: payload.mac,
      level: currentLevel,
      temperature: currentTemp,      // ใช้ตัวแปรที่ดึงมาใหม่
      air_humidity: currentHumid,    // ใช้ตัวแปรที่ดึงมาใหม่
      status: currentLevel >= (device.criticalThreshold || 7) ? 'Critical' : (currentLevel >= (device.warningThreshold || 3) ? 'Warning' : 'Normal')
    });

    // ค) 🚨 จัดการแจ้งเตือน (Check Remote Control: isActive)
    if (device.isActive) {
      if (currentLevel >= (device.criticalThreshold || 7.0)) {
        const alertMsg = `🚨 [วิกฤต] ${device.name}\n🌊 ระดับน้ำ: ${currentLevel.toFixed(1)} cm\n🌡️ ${currentTemp.toFixed(1)}°C | 💧 ${currentHumid}%\n📢 โปรดตรวจสอบพื้นที่โดยด่วน!`;
        await sendLineMessage(alertMsg);
      }
    }

    // ง) ✨ ส่งคำสั่งกลับไปหาบอร์ด (Remote Control Response)
    return NextResponse.json({ 
      success: true, 
      isBuzzerEnabled: device.isBuzzerEnabled, 
      isActive: device.isActive,               
      warningLimit: device.warningThreshold,
      criticalLimit: device.criticalThreshold
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 🌟 3. GET: ดึงข้อมูลประวัติ (คงเดิม)
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