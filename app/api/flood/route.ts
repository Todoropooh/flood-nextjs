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
 * 📥 [GET] ดึงข้อมูลไปโชว์ที่ Dashboard และกันหน้า Admin พัง
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
    else startDate.setMonth(startDate.getMonth() - 1);

    let query: any = { createdAt: { $gte: startDate } };
    if (mac && mac !== "null" && mac !== "undefined") query.mac = mac;

    // เติม .lean() คืนค่า JSON บริสุทธิ์ หน้าเว็บเอาไปใช้จะได้ไม่ Error
    const logs = await WaterLog.find(query).sort({ createdAt: 1 }).limit(1000).lean();
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
    // รับค่าที่บอร์ด ESP32 ส่งมา (บอร์ดคำนวณ "ระดับน้ำจากพื้น" มาให้ในตัวแปร level แล้ว!)
    const { mac, level, signal, temperature, air_humidity } = payload;
    
    if (!mac) return NextResponse.json({ error: "MAC Required" }, { status: 400 });

    await connectDB();
    const device = await Device.findOne({ mac });
    if (!device) return NextResponse.json({ error: "Device not found" }, { status: 404 });

    // 📏 ดึงความสูงกล่องมาแค่เพื่อเอาไว้เป็น Limit ป้องกันกราฟทะลุ
    const h = Number(device.installHeight) || 12.6; 
    
    // 🌊 เอาค่าระดับน้ำที่บอร์ดส่งมา ใช้ตรงๆ เลยครับ!
    let wl = Number(level) || 0; 
    
    // ดักไว้เผื่อบอร์ดรวนส่งค่าติดลบ หรือค่าเกินความสูงกล่อง
    if (wl < 0) wl = 0;
    if (wl > h) wl = h;

    // 🚦 เช็คสถานะตามเกณฑ์ที่ตั้งไว้ในหน้า Admin
    const status = wl >= (device.criticalThreshold || 5) ? "CRITICAL" : 
                   (wl >= (device.warningThreshold || 2) ? "WARNING" : "STABLE");

    // 📝 อัปเดตข้อมูลล่าสุดลง Device (สำหรับโชว์หน้าเว็บ Dashboard ตัวเลขใหญ่ๆ)
    await Device.findOneAndUpdate({ mac }, { 
      waterLevel: wl, 
      lastPing: new Date(),
      status: status
    });

    // 📝 บันทึกประวัติลง WaterLog (สำหรับวาดกราฟ)
    await WaterLog.create({ 
      mac, 
      level: wl, 
      signal: Number(signal) || 0,
      temperature: Number(temperature) || 0,
      air_humidity: Number(air_humidity) || 0,
      status: status 
    });

    // 🔔 ส่งแจ้งเตือนผ่าน Telegram (ถ้าเปิดระบบและระดับน้ำเกินเกณฑ์)
    if (device.isActive && status !== "STABLE") {
      const alertStatus = status === "CRITICAL" ? "🚨 [อันตราย] ระดับน้ำวิกฤต!" : "⚠️ [เฝ้าระวัง] ระดับน้ำสูง!";
      const now = Date.now();
      const lastAlert = lastAlertTime.get(mac) || 0;
      
      if (now - lastAlert > ALERT_COOLDOWN) {
        const msg = `<b>${alertStatus}</b>\n📍 สถานี: <b>${device.name || 'Station'}</b>\n🌊 ระดับน้ำ: <code>${wl.toFixed(2)} cm</code>\n📡 สัญญาณ: ${signal || 0}`;
        await sendTelegramMessage(msg);
        lastAlertTime.set(mac, now);
      }
    }

    return NextResponse.json({ success: true, waterLevel: wl.toFixed(2), status: status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}