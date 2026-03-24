import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/db/connect";
import WaterLog from "@/db/models/WaterLog";
import Device from "@/db/models/Device";

export const dynamic = 'force-dynamic';

// ⏱️ Cooldown: ป้องกันบอทส่งรัวเกินไป (1 นาที ต่อ 1 อุปกรณ์)
const lastAlertTime = new Map<string, number>();
const ALERT_COOLDOWN = 1 * 60 * 1000; 

/**
 * 🛰️ ฟังก์ชันส่งข้อความเข้า Telegram
 */
async function sendTelegramMessage(message: string) {
  const BOT_TOKEN = "8130732948:AAFNf-e3dWlPXvdccuE-C9hx2LZ_DLtGUMQ"; 
  const CHAT_ID = "8044413286"; 

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: "HTML"
      }),
    });

    const result = await response.json();
    if (!result.ok) {
      console.error("❌ Telegram ERROR:", result.description);
      return `Error: ${result.description}`;
    }
    return "Success";
  } catch (error: any) {
    return error.message;
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json(); 
    const { mac, level, temperature, humidity, air_humidity, signal } = payload;
    
    if (!mac) return NextResponse.json({ error: "MAC Required" }, { status: 400 });

    await connectDB();
    const device = await Device.findOne({ mac });
    if (!device) return NextResponse.json({ error: "Device not found" }, { status: 404 });

    // 🌊 Logic คำนวณระดับน้ำ
    const h = device.installHeight ?? 13.5;
    const warnLimit = device.warningThreshold ?? 2.8;
    const critLimit = device.criticalThreshold ?? 3.0;

    const currentDist = Number(level ?? h);
    let wl = h - currentDist;
    if (currentDist >= (h - 0.1)) wl = 0;
    if (wl > h) wl = h;
    if (wl < 0) wl = 0;

    // 🚦 ตรวจสอบสถานะ
    let currentStatus = "STABLE";
    let alertStatus = "";
    if (wl >= (critLimit - 0.05)) {
      currentStatus = "CRITICAL";
      alertStatus = "🚨 [อันตราย] ระดับน้ำวิกฤต!";
    } else if (wl >= (warnLimit - 0.05)) {
      currentStatus = "WARNING";
      alertStatus = "⚠️ [เฝ้าระวัง] ระดับน้ำสูง!";
    }

    // 📝 บันทึกข้อมูล
    await Device.findOneAndUpdate({ mac }, { 
      waterLevel: currentDist, temperature, humidity: air_humidity ?? humidity, status: currentStatus, lastPing: new Date() 
    });
    await WaterLog.create({ mac, level: currentDist, temperature, air_humidity: air_humidity ?? humidity, signal, status: currentStatus });

    // 🔔 ส่ง Telegram แจ้งเตือน
    let telStatus = "Normal";
    if (device.isActive && alertStatus !== "") {
      const now = Date.now();
      const lastAlert = lastAlertTime.get(mac) || 0;
      if (now - lastAlert > ALERT_COOLDOWN) {
        const msg = `<b>${alertStatus}</b>\n\n📍 สถานี: <b>${device.name}</b>\n🌊 ระดับน้ำ: <code>${wl.toFixed(2)} cm</code>\n🌡️ อุณหภูมิ: ${Number(temperature).toFixed(1)}°C\n📡 สัญญาณ: ${signal}%`;
        await sendTelegramMessage(msg);
        lastAlertTime.set(mac, now);
        telStatus = "Sent Telegram";
      }
    }

    return NextResponse.json({ success: true, waterLevel: wl.toFixed(2), status: currentStatus, telegram: telStatus });
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
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}