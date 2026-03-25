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
 * 📥 [GET] ดึงข้อมูลย้อนหลังตาม Timeframe (แบบไม่จำกัดจำนวน)
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const mac = searchParams.get('mac');
    const timeframe = searchParams.get('timeframe') || 'day';

    let startDate = new Date();
    // 🌟 คำนวณช่วงเวลาย้อนหลังให้แม่นยำ
    if (timeframe === 'day') startDate.setHours(startDate.getHours() - 24);
    else if (timeframe === 'week') startDate.setDate(startDate.getDate() - 7);
    else if (timeframe === 'month') startDate.setMonth(startDate.getMonth() - 1);
    else if (timeframe === 'year') startDate.setFullYear(startDate.getFullYear() - 1);

    let query: any = { createdAt: { $gte: startDate } };
    if (mac && mac !== "null" && mac !== "undefined") query.mac = mac;

    // 🌟 พระเอก: ดึงข้อมูล "ทั้งหมด" ในช่วงเวลานั้น เรียงจากเก่าไปใหม่ เพื่อให้กราฟแสดงต่อเนื่อง
    let logs = await WaterLog.find(query).sort({ createdAt: 1 }).lean();
    
    return NextResponse.json(logs || []); 
  } catch (error: any) {
    console.error("GET Error:", error);
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
    
    // ป้องกันค่าเพี้ยนเกินความจุถัง
    if (wl < 0) wl = 0;
    if (wl > h) wl = h;

    const status = wl >= (device.criticalThreshold || 10) ? "CRITICAL" : 
                   (wl >= (device.warningThreshold || 5) ? "WARNING" : "STABLE");

    // 📝 อัปเดตสถานะล่าสุดโชว์หน้า Dashboard
    await Device.findOneAndUpdate({ mac }, { 
      waterLevel: wl, 
      temperature: Number(temperature) || 0,
      humidity: Number(humidity) || 0,
      lastPing: new Date(),
      status: status
    });

    // 📝 บันทึกประวัติลง Database เพื่อวาดกราฟ
    await WaterLog.create({ 
      mac, 
      level: wl, 
      signal: Number(signal) || 0,
      temperature: Number(temperature) || 0,
      air_humidity: Number(humidity) || 0, 
      status: status 
    });

    // 🔔 ระบบแจ้งเตือน Telegram
    if (device.isActive && status !== "STABLE") {
      const alertStatus = status === "CRITICAL" ? "🚨 ระดับน้ำวิกฤต!" : "⚠️ เฝ้าระวังน้ำสูง!";
      const now = Date.now();
      const lastAlert = lastAlertTime.get(mac) || 0;
      
      if (now - lastAlert > ALERT_COOLDOWN) {
        const msg = `<b>${alertStatus}</b>\n📍 ${device.name}\n🌊 ระดับ: <b>${wl.toFixed(2)} cm</b>\n🌡️ Temp: ${Number(temperature).toFixed(1)}°C\n💧 Humid: ${Number(humidity).toFixed(1)}%`;
        await sendTelegramMessage(msg);
        lastAlertTime.set(mac, now);
      }
    }
    
    return NextResponse.json({ success: true, waterLevel: wl.toFixed(2) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}