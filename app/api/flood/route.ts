import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/db/connect";
import WaterLog from "@/db/models/WaterLog";
import Device from "@/db/models/Device";

export const dynamic = 'force-dynamic';

const lastAlertTime = new Map<string, number>();
const ALERT_COOLDOWN = 1 * 60 * 1000; 

async function sendTelegramMessage(message: string) {
  const BOT_TOKEN = "8130732948:AAFNf-e3dWlPXvdccuE-C9hx2LZ_DLtGUMQ"; 
  const CHAT_ID = "8044413286"; 
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode: "HTML" }),
    });
    return "Success";
  } catch (e) { return "Error"; }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json(); 
    const { mac, level, temperature, humidity, air_humidity, signal } = payload;
    
    if (!mac) return NextResponse.json({ error: "MAC Required" }, { status: 400 });

    await connectDB();
    const device = await Device.findOne({ mac });
    if (!device) return NextResponse.json({ error: "Device not found" }, { status: 404 });

    // 🌊 ดึงค่า Config จาก Device (ใช้ค่า Default ถ้าไม่มี)
    const h = Number(device.installHeight) || 13.5;
    const warnLimit = Number(device.warningThreshold) || 2.8;
    const critLimit = Number(device.criticalThreshold) || 3.0;

    // 🛠️ ปรับจูนค่าที่รับมาให้เป็นตัวเลขที่ปลอดภัย
    const currentDist = Number(level) || h;
    const currentTemp = Number(temperature) || 0;
    const currentHumid = Number(air_humidity ?? humidity) || 0;
    const currentSignal = Number(signal) || 0;

    // คำนวณระดับน้ำ (Water Level)
    let wl = h - currentDist;
    if (currentDist >= (h - 0.2)) wl = 0;
    if (wl < 0) wl = 0;
    if (wl > h) wl = h;

    // 🚦 ตรวจสอบสถานะน้ำ
    let currentStatus = "STABLE";
    let alertStatus = "";
    if (wl >= (critLimit - 0.05)) {
      currentStatus = "CRITICAL";
      alertStatus = "🚨 [อันตราย] ระดับน้ำวิกฤต!";
    } else if (wl >= (warnLimit - 0.05)) {
      currentStatus = "WARNING";
      alertStatus = "⚠️ [เฝ้าระวัง] ระดับน้ำสูง!";
    }

    // 📝 1. อัปเดตสถานะล่าสุดลงในตัวอุปกรณ์ (Device)
    await Device.findOneAndUpdate({ mac }, { 
      waterLevel: wl, // เก็บระดับน้ำจริง
      temperature: currentTemp, 
      humidity: currentHumid, 
      status: currentStatus, 
      lastPing: new Date() 
    });

    // 📝 2. บันทึกประวัติ (Log) ลงใน WaterLog
    await WaterLog.create({ 
      mac, 
      level: wl, // เก็บระดับน้ำจริงลง Log
      temperature: currentTemp, 
      air_humidity: currentHumid, 
      signal: currentSignal, 
      status: currentStatus 
    });

    // 🔔 3. ส่ง Telegram (ถ้าเปิดใช้งานและถึงเกณฑ์)
    if (device.isActive && alertStatus !== "") {
      const now = Date.now();
      const lastAlert = lastAlertTime.get(mac) || 0;
      if (now - lastAlert > ALERT_COOLDOWN) {
        const msg = `<b>${alertStatus}</b>\n📍 สถานี: <b>${device.name}</b>\n🌊 ระดับน้ำ: <code>${wl.toFixed(2)} cm</code>\n📡 สัญญาณ: ${currentSignal}`;
        await sendTelegramMessage(msg);
        lastAlertTime.set(mac, now);
      }
    }

    return NextResponse.json({ success: true, waterLevel: wl.toFixed(2), status: currentStatus });

  } catch (error: any) {
    console.error("❌ CRITICAL API ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}