import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/db/connect";
import WaterLog from "@/db/models/WaterLog";
import Device from "@/db/models/Device";

export const dynamic = 'force-dynamic';

// --- ฟังก์ชันส่ง LINE (เหมือนเดิม) ---
async function sendLineMessage(message: string) {
  const ACCESS_TOKEN = "JSP4AFcQD0fSIwxGBIQXT+W2h/sD3wcdPUaLPu5I4znODmfu9l1qLVMgP328d/CZbBD8vRxfgv0LMwtc5Hn3MnQEovNDRLejZJ/VstvpNgfi98Kv/RXYQUQMbgg4TEbDeii03sBTNE4L9hkwS7tV/wdB04t89/1O/w1cDnyilFU="; 
  const USER_ID = "Ub9d815d4781936f90560a1c8f243d859"; 
  try {
    await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ACCESS_TOKEN}` },
      body: JSON.stringify({ to: USER_ID, messages: [{ type: "text", text: message }] }),
    });
  } catch (error) { console.error("❌ LINE Error:", error); }
}

// --- บันทึกข้อมูลจาก ESP32 ---
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json(); 
    await connectDB();

    const currentLevel = Number(payload.level ?? 0);
    const currentTemp = Number(payload.temperature ?? 0);
    const currentHumid = Number(payload.air_humidity ?? payload.humidity ?? 0);

    const device = await Device.findOneAndUpdate(
      { mac: payload.mac },
      { waterLevel: currentLevel, temperature: currentTemp, humidity: currentHumid, lastPing: new Date() },
      { new: true, upsert: false } 
    );

    if (!device) return NextResponse.json({ error: "Device not found" }, { status: 404 });

    await WaterLog.create({
      mac: payload.mac,
      level: currentLevel,
      temperature: currentTemp,
      air_humidity: currentHumid
    });

    if (device.isActive && currentLevel >= (device.criticalThreshold || 7.0)) {
      const alertMsg = `🚨 [วิกฤต] ${device.name}\n🌊 ระดับน้ำ: ${currentLevel.toFixed(1)} cm\n🌡️ ${currentTemp.toFixed(1)}°C | 💧 ${currentHumid.toFixed(1)}%`;
      await sendLineMessage(alertMsg);
    }

    return NextResponse.json({ success: true, isBuzzerEnabled: device.isBuzzerEnabled, isActive: device.isActive });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}

// --- ดึงข้อมูลย้อนหลังตาม Timeframe (Day/Week/Month) ---
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // ดึงค่าจาก Query String เช่น /api/flood?timeframe=week
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || 'day';

    // คำนวณช่วงเวลาย้อนหลัง
    let startDate = new Date();
    if (timeframe === 'day') {
      startDate.setHours(startDate.getHours() - 24);
    } else if (timeframe === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeframe === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    // กรองข้อมูลตามเงื่อนไขเวลา
    const logs = await WaterLog.find({
      createdAt: { $gte: startDate }
    }).sort({ createdAt: 1 }); // เรียงจากเก่าไปใหม่เพื่อให้กราฟวาดสวยๆ

    return NextResponse.json(logs);
  } catch (error: any) { 
    return NextResponse.json({ error: error.message }, { status: 500 }); 
  }
}