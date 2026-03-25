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

/**
 * 📥 [GET] สำหรับหน้าเว็บดึงข้อมูลไปโชว์ (แก้ 405 Method Not Allowed)
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || 'day';
    const mac = searchParams.get('mac');

    let startDate = new Date();
    if (timeframe === 'day') startDate.setHours(startDate.getHours() - 24);
    else if (timeframe === 'week') startDate.setDate(startDate.getDate() - 7);
    else if (timeframe === 'month') startDate.setMonth(startDate.getMonth() - 1);

    // สร้าง Query ค้นหา
    let query: any = { createdAt: { $gte: startDate } };
    if (mac) query.mac = mac;

    const logs = await WaterLog.find(query).sort({ createdAt: 1 });
    
    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * 📤 [POST] สำหรับ ESP32 ส่งข้อมูลมาบันทึก
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json(); 
    const { mac, level, temperature, humidity, air_humidity, signal } = payload;
    
    if (!mac) return NextResponse.json({ error: "MAC Required" }, { status: 400 });

    await connectDB();
    const device = await Device.findOne({ mac });
    if (!device) return NextResponse.json({ error: "Device not found" }, { status: 404 });

    const h = Number(device.installHeight) || 13.5;
    const warnLimit = Number(device.warningThreshold) || 2.8;
    const critLimit = Number(device.criticalThreshold) || 3.0;

    const currentDist = Number(level) || h;
    const currentTemp = Number(temperature) || 0;
    const currentHumid = Number(air_humidity ?? humidity) || 0;
    const currentSignal = Number(signal) || 0;

    let wl = h - currentDist;
    if (currentDist >= (h - 0.2)) wl = 0;
    if (wl < 0) wl = 0;
    if (wl > h) wl = h;

    let currentStatus = "STABLE";
    let alertStatus = "";
    if (wl >= (critLimit - 0.05)) {
      currentStatus = "CRITICAL";
      alertStatus = "🚨 [อันตราย] ระดับน้ำวิกฤต!";
    } else if (wl >= (warnLimit - 0.05)) {
      currentStatus = "WARNING";
      alertStatus = "⚠️ [เฝ้าระวัง] ระดับน้ำสูง!";
    }

    await Device.findOneAndUpdate({ mac }, { 
      waterLevel: wl,
      temperature: currentTemp, 
      humidity: currentHumid, 
      status: currentStatus, 
      lastPing: new Date() 
    });

    await WaterLog.create({ 
      mac, 
      level: wl,
      temperature: currentTemp, 
      air_humidity: currentHumid, 
      signal: currentSignal, 
      status: currentStatus 
    });

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