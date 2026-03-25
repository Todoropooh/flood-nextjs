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
 * 📥 [GET] ดึงข้อมูลไปโชว์ที่ Dashboard
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const mac = searchParams.get('mac');
    const timeframe = searchParams.get('timeframe') || 'day';

    let startDate = new Date();
    if (timeframe === 'day') startDate.setHours(startDate.getHours() - 24);
    else if (timeframe === 'week') startDate.setDate(startDate.getDate() - 7);
    else if (timeframe === 'month') startDate.setMonth(startDate.getMonth() - 1);
    else if (timeframe === 'year') startDate.setFullYear(startDate.getFullYear() - 1); // 🌟 รองรับการดึงข้อมูล 1 ปี

    let query: any = { createdAt: { $gte: startDate } };
    if (mac && mac !== "null" && mac !== "undefined") query.mac = mac;

    // 🌟 ดึง 1000 แถวล่าสุดและ reverse เพื่อให้กราฟเรียงจากซ้ายไปขวา (อดีต -> ปัจจุบัน)
    let logs = await WaterLog.find(query).sort({ createdAt: -1 }).limit(1000).lean();
    logs = logs.reverse(); 
    
    return NextResponse.json(logs || []); 
  } catch (error: any) {
    return NextResponse.json([]); 
  }
}

/**
 * 📤 [POST] รับข้อมูลจาก ESP32
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json(); 
    const { mac, level, signal, temperature, humidity } = payload;
    
    if (!mac) return NextResponse.json({ error: "MAC Required" }, { status: 400 });

    await connectDB();
    const device = await Device.findOne({ mac });
    if (!device) return NextResponse.json({ error: "Device not found" }, { status: 404 });

    const h = Number(device.installHeight) || 29.5; 
    let wl = Number(level) || 0; 
    
    // ป้องกันค่าเพี้ยน
    if (wl < 0) wl = 0;
    if (wl > h) wl = h;

    const status = wl >= (device.criticalThreshold || 10) ? "CRITICAL" : 
                   (wl >= (device.warningThreshold || 5) ? "WARNING" : "STABLE");

    // 📝 อัปเดต Device ล่าสุด
    await Device.findOneAndUpdate({ mac }, { 
      waterLevel: wl, 
      temperature: Number(temperature) || 0,
      humidity: Number(humidity) || 0,
      lastPing: new Date(),
      status: status
    });

    // 📝 บันทึกประวัติ Log (ใช้ air_humidity ให้ตรงกับโมเดลเดิม)
    await WaterLog.create({ 
      mac, 
      level: wl, 
      signal: Number(signal) || 0,
      temperature: Number(temperature) || 0,
      air_humidity: Number(humidity) || 0, 
      status: status 
    });

    // 🔔 แจ้งเตือน Telegram
    if (device.isActive && status !== "STABLE") {
      const alertStatus = status === "CRITICAL" ? "🚨 [อันตราย] ระดับน้ำวิกฤต!" : "⚠️ [เฝ้าระวัง] ระดับน้ำสูง!";
      const now = Date.now();
      const lastAlert = lastAlertTime.get(mac) || 0;
      
      if (now - lastAlert > ALERT_COOLDOWN) {
        const msg = `<b>${alertStatus}</b>\n📍 สถานี: <b>${device.name || 'Station'}</b>\n🌊 ระดับน้ำ: <code>${wl.toFixed(2)} cm</code>\n🌡️ อุณหภูมิ: ${Number(temperature).toFixed(1)}°C\n💧 ความชื้น: ${Number(humidity).toFixed(1)}%`;
        await sendTelegramMessage(msg);
        lastAlertTime.set(mac, now);
      }
    }

    return NextResponse.json({ success: true, waterLevel: wl.toFixed(2), status: status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}