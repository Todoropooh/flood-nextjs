import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/db/connect";
import WaterLog from "@/db/models/WaterLog";
import Device from "@/db/models/Device";

export const dynamic = 'force-dynamic';

// --- ฟังก์ชันส่ง LINE พร้อมจับ Error ---
async function sendLineMessage(message: string) {
  const ACCESS_TOKEN = "JSP4AFcQD0fSIwxGBIQXT+W2h/sD3wcdPUaLPu5I4znODmfu9l1qLVMgP328d/CZbBD8vRxfgv0LMwtc5Hn3MnQEovNDRLejZJ/VstvpNgfi98Kv/RXYQUQMbgg4TEbDeii03sBTNE4L9hkwS7tV/wdB04t89/1O/w1cDnyilFU="; 
  const USER_ID = "Ub9d815d4781936f90560a1c8f243d859"; 
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ACCESS_TOKEN}` },
      body: JSON.stringify({ to: USER_ID, messages: [{ type: "text", text: message }] }),
    });
    
    // ดึงคำตอบจาก LINE มาดูว่าส่งผ่านไหม หรือติด Limit
    const result = await response.text();
    console.log("📨 LINE API Response:", result);
    return result; 
  } catch (error: any) { 
    console.error("❌ LINE Error:", error); 
    return error.message;
  }
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

    // 🌟 คำนวณระดับน้ำ 
    let wl = (84.0 - currentLevel) - 5.0;
    if (currentLevel <= 0.5 || currentLevel > 90) wl = 0;
    if (wl > 40) wl = 40;
    if (wl < 0) wl = 0;

    let lineDebugMessage = "ไม่ได้เข้าเงื่อนไขเตือนน้ำ";

    // 🌟 บังคับเทสต์ส่ง LINE (ถ้าน้ำเกิน 10 ซม.)
    if (device.isActive) {
      let alertStatus = "";
      if (wl >= 20.0) alertStatus = "🚨 [อันตราย] ระดับน้ำวิกฤต!";
      else if (wl >= 10.0) alertStatus = "⚠️ [เฝ้าระวัง] ระดับน้ำสูงกว่าเกณฑ์!";

      if (alertStatus !== "") {
        const alertMsg = `${alertStatus}\n📍 ${device.name}\n🌊 ระดับน้ำ: ${wl.toFixed(1)} cm\n🌡️ ${currentTemp.toFixed(1)}°C | 💧 ${currentHumid.toFixed(1)}%`;
        
        // สั่งส่ง LINE และเก็บผลลัพธ์
        lineDebugMessage = await sendLineMessage(alertMsg) || "เกิดข้อผิดพลาดในการเรียก LINE API";
      }
    } else {
      lineDebugMessage = "ระบบถูกปิดอยู่ (isActive = false)";
    }

    return NextResponse.json({ 
      success: true, 
      isBuzzerEnabled: device.isBuzzerEnabled, 
      isActive: device.isActive,
      line_status: lineDebugMessage // 👈 ส่งค่า Error กลับไปให้ ESP32 อ่าน!
    });
  } catch (error: any) { 
    return NextResponse.json({ error: error.message }, { status: 500 }); 
  }
}

// --- ดึงข้อมูลย้อนหลัง ---
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || 'day';

    let startDate = new Date();
    if (timeframe === 'day') startDate.setHours(startDate.getHours() - 24);
    else if (timeframe === 'week') startDate.setDate(startDate.getDate() - 7);
    else if (timeframe === 'month') startDate.setMonth(startDate.getMonth() - 1);

    const logs = await WaterLog.find({ createdAt: { $gte: startDate } }).sort({ createdAt: 1 });
    return NextResponse.json(logs);
  } catch (error: any) { 
    return NextResponse.json({ error: error.message }, { status: 500 }); 
  }
}