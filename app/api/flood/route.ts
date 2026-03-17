import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/db/connect";
import WaterLog from "@/db/models/WaterLog";
import Device from "@/db/models/Device";

export const dynamic = 'force-dynamic';

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

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json(); 
    await connectDB();

    // 🛡️ บังคับแปลงเป็น Number และรองรับทุกชื่อตัวแปรที่อาจมาจากบอร์ด
    const currentLevel = Number(payload.level ?? payload.water_level ?? 0);
    const currentTemp = Number(payload.temperature ?? payload.temp ?? 0);
    const currentHumid = Number(payload.air_humidity ?? payload.humidity ?? payload.humid ?? 0);

    // ก) อัปเดตข้อมูลลงตาราง Device
    const device = await Device.findOneAndUpdate(
      { mac: payload.mac },
      { 
        waterLevel: currentLevel,
        temperature: currentTemp,
        humidity: currentHumid,   
        lastPing: new Date() 
      },
      { new: true, upsert: false } 
    );

    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    // ข) บันทึกประวัติลงตาราง WaterLog
    await WaterLog.create({
      mac: payload.mac,
      level: currentLevel,
      temperature: currentTemp,    
      air_humidity: currentHumid,  
    });

    // ค) จัดการแจ้งเตือน LINE
    if (device.isActive && currentLevel >= (device.criticalThreshold || 7.0)) {
        const alertMsg = `🚨 [วิกฤต] ${device.name}\n🌊 ระดับน้ำ: ${currentLevel.toFixed(1)} cm\n🌡️ ${currentTemp.toFixed(1)}°C | 💧 ${currentHumid.toFixed(1)}%\n📢 โปรดตรวจสอบพื้นที่โดยด่วน!`;
        await sendLineMessage(alertMsg);
    }

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

    const logs = await WaterLog.find({ createdAt: { $gte: startDate } }).sort({ createdAt: 1 });
    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}