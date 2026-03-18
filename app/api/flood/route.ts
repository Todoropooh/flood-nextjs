import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/db/connect";
import WaterLog from "@/db/models/WaterLog";
import Device from "@/db/models/Device";

export const dynamic = 'force-dynamic';

// 🌟 1. เพิ่มตัวแปรกัน Spam LINE (ป้องกันไม่ให้ข้อความเด้งรัวๆ ทุก 5 วินาที)
const lastAlertTime = new Map<string, number>();
const ALERT_COOLDOWN = 3 * 60 * 1000; // หน่วงเวลาแจ้งเตือนซ้ำ 3 นาที

// --- ฟังก์ชันส่ง LINE ---
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

    const currentLevel = Number(payload.level ?? 0); // ได้ค่าระยะเซ็นเซอร์ดิบมา
    const currentTemp = Number(payload.temperature ?? 0);
    const currentHumid = Number(payload.air_humidity ?? payload.humidity ?? 0);

    const device = await Device.findOneAndUpdate(
      { mac: payload.mac },
      { waterLevel: currentLevel, temperature: currentTemp, humidity: currentHumid, lastPing: new Date() },
      { new: true, upsert: false } 
    );

    if (!device) return NextResponse.json({ error: "Device not found" }, { status: 404 });

    // บันทึกลง WaterLog
    await WaterLog.create({
      mac: payload.mac,
      level: currentLevel,
      temperature: currentTemp,
      air_humidity: currentHumid
    });

    // ✅ 2. แปลงระยะเซ็นเซอร์ให้เป็นระดับน้ำจริง (สูตรเดียวกับหน้าเว็บ)
    let wl = (84.0 - currentLevel) - 5.0;
    if (currentLevel <= 0.5 || currentLevel > 90) wl = 0;
    if (wl > 40) wl = 40;
    if (wl < 0) wl = 0;

    // ✅ 3. NEW ALERT LOGIC: แจ้งเตือนตามระดับน้ำ (แดง >= 20, ส้ม >= 10)
    if (device.isActive) {
      let alertStatus = "";
      
      if (wl >= 20.0) {
        alertStatus = "🚨 [อันตราย] ระดับน้ำวิกฤต!";
      } else if (wl >= 10.0) {
        alertStatus = "⚠️ [เฝ้าระวัง] ระดับน้ำสูงกว่าเกณฑ์!";
      }

      // ตรวจสอบระบบ Cooldown เพื่อกัน Spam
      const now = Date.now();
      const lastAlert = lastAlertTime.get(payload.mac) || 0;

      // ถ้าเข้าเกณฑ์แจ้งเตือน และ ผ่านไปแล้ว 3 นาทีจากการเตือนครั้งล่าสุด
      if (alertStatus !== "" && (now - lastAlert > ALERT_COOLDOWN)) {
        // อัปเดตข้อความให้โชว์เป็น "ระดับน้ำ" (ซม.) แทนระยะเซ็นเซอร์
        const alertMsg = `${alertStatus}\n📍 ${device.name}\n🌊 ระดับน้ำ: ${wl.toFixed(1)} cm\n🌡️ ${currentTemp.toFixed(1)}°C | 💧 ${currentHumid.toFixed(1)}%`;
        
        await sendLineMessage(alertMsg);
        
        // บันทึกเวลาที่เพิ่งส่งไป
        lastAlertTime.set(payload.mac, now);
      }
    }

    return NextResponse.json({ 
      success: true, 
      isBuzzerEnabled: device.isBuzzerEnabled, 
      isActive: device.isActive 
    });
  } catch (error: any) { 
    return NextResponse.json({ error: error.message }, { status: 500 }); 
  }
}

// --- ดึงข้อมูลย้อนหลังตาม Timeframe (Day/Week/Month) ---
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || 'day';

    let startDate = new Date();
    if (timeframe === 'day') {
      startDate.setHours(startDate.getHours() - 24);
    } else if (timeframe === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeframe === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const logs = await WaterLog.find({
      createdAt: { $gte: startDate }
    }).sort({ createdAt: 1 });

    return NextResponse.json(logs);
  } catch (error: any) { 
    return NextResponse.json({ error: error.message }, { status: 500 }); 
  }
}