import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/db/connect";
import WaterLog from "@/db/models/WaterLog";
import Device from "@/db/models/Device";

export const dynamic = 'force-dynamic';
const lastAlertTime = new Map<string, number>();
const ALERT_COOLDOWN = 1 * 60 * 1000; // ⏱️ ตั้งค่าหน่วงเวลาเตือน LINE (1 นาที)

async function sendLineMessage(message: string) {
  const ACCESS_TOKEN = "JSP4AFcQD0fSIwxGBIQXT+W2h/sD3wcdPUaLPu5I4znODmfu9l1qLVMgP328d/CZbBD8vRxfgv0LMwtc5Hn3MnQEovNDRLejZJ/VstvpNgfi98Kv/RXYQUQMbgg4TEbDeii03sBTNE4L9hkwS7tV/wdB04t89/1O/w1cDnyilFU="; 
  const USER_ID = "Ub9d815d4781936f90560a1c8f243d859"; 
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ACCESS_TOKEN}` },
      body: JSON.stringify({ to: USER_ID, messages: [{ type: "text", text: message }] }),
    });
    return await response.text();
  } catch (error: any) { return error.message; }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json(); 
    await connectDB();

    // 🌟 1. ดึงข้อมูลอุปกรณ์จาก Database "ก่อน" เพื่อเอาค่า 13.5, 2.8, 3.0
    const device = await Device.findOne({ mac: payload.mac });
    if (!device) return NextResponse.json({ error: "Device not found" }, { status: 404 });

    // ดึงค่า Config (ถ้าไม่เจอให้ใช้ค่า Default สำหรับระยะ 13.5)
    const h = device.installHeight ?? 13.5;
    const warnLimit = device.warningThreshold ?? 2.8;
    const critLimit = device.criticalThreshold ?? 3.0;

    const currentDist = Number(payload.level ?? h); // เปลี่ยนชื่อตัวแปรเป็น Dist เพื่อความไม่งง
    const currentTemp = Number(payload.temperature ?? 0);
    const currentHumid = Number(payload.air_humidity ?? payload.humidity ?? 0);
    const currentSignal = Number(payload.signal ?? 0);

    // 🌟 2. คำนวณระดับน้ำแม่นยำสูง (หลักการเดียวกับหน้า Dashboard เป๊ะ!)
    let wl = (h - currentDist);
    if (currentDist >= (h - 0.1)) wl = 0; // Noise Filter ถ้าน้ำแห้ง
    if (wl > h) wl = h;
    if (wl < 0) wl = 0;

    // 🌟 3. ตรวจสอบสถานะว่าต้องแจ้งเตือนไหม (บวกค่าเผื่อ Tolerance 0.05 เข้าไป)
    const tolerance = 0.05;
    let currentStatus = "STABLE";
    let alertStatus = "";
    
    if (wl >= (critLimit - tolerance)) {
      currentStatus = "CRITICAL";
      alertStatus = "🚨 [อันตราย] ระดับน้ำวิกฤต!";
    } else if (wl >= (warnLimit - tolerance)) {
      currentStatus = "WARNING";
      alertStatus = "⚠️ [เฝ้าระวัง] ระดับน้ำสูงกว่าเกณฑ์!";
    }

    // 4. อัปเดตข้อมูล Device ในฐานข้อมูล
    await Device.findOneAndUpdate(
      { mac: payload.mac },
      { 
        waterLevel: currentDist, // เซฟระยะที่อ่านได้จริง
        temperature: currentTemp, 
        humidity: currentHumid,
        status: currentStatus,   // 🌟 เซฟสถานะล่าสุด (สีแดง/ส้ม/เขียว) เข้าไปเลย
        lastPing: new Date() 
      },
      { new: true } 
    );

    // 5. บันทึกข้อมูลประวัติ (WaterLog)
    await WaterLog.create({
      mac: payload.mac,
      level: currentDist,        // เซฟระยะที่อ่านได้จริง
      temperature: currentTemp,
      air_humidity: currentHumid,
      signal: currentSignal,
      status: currentStatus      // 🌟 เซฟสถานะลง Log ด้วย
    });

    // 6. 🔔 ระบบแจ้งเตือน LINE
    let lineStatus = "Normal";
    if (device.isActive && alertStatus !== "") {
      const now = Date.now();
      const lastAlert = lastAlertTime.get(payload.mac) || 0;
      
      if (now - lastAlert > ALERT_COOLDOWN) {
        // ปรับแต่งข้อความ LINE ให้ละเอียดขึ้น มีบอกจุดวิกฤตด้วย
        const alertMsg = `${alertStatus}\n📍 จุดติดตั้ง: ${device.name}\n🌊 ระดับน้ำ: ${wl.toFixed(2)} cm\n📏 เกณฑ์อันตราย: ${critLimit.toFixed(1)} cm\n🌡️ ${currentTemp.toFixed(1)}°C | 💧 ${currentHumid.toFixed(1)}%`;
        
        await sendLineMessage(alertMsg);
        lastAlertTime.set(payload.mac, now);
        lineStatus = "Sent Alert";
      }
    }

    return NextResponse.json({ 
      success: true, 
      waterLevel: wl.toFixed(2), 
      status: currentStatus, 
      line_status: lineStatus 
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

    const logs = await WaterLog.find({ createdAt: { $gte: startDate } }).sort({ createdAt: 1 });
    return NextResponse.json(logs);
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}