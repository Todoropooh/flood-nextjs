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
    else if (timeframe === 'year') startDate.setFullYear(startDate.getFullYear() - 1);

    let query: any = { createdAt: { $gte: startDate } };
    if (mac && mac !== "null" && mac !== "undefined") query.mac = mac;

    let logs = await WaterLog.find(query).sort({ createdAt: 1 }).lean();
    return NextResponse.json(logs || []); 
  } catch (error: any) {
    return NextResponse.json([]); 
  }
}

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
    if (wl < 0) wl = 0;
    if (wl > h) wl = h;

    // 📈 [TREND LOGIC] คำนวณแนวโน้มแบบแม่นยำ
    // ดึงข้อมูลย้อนหลัง 15 นาทีมาหาค่าเฉลี่ย
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);

    const [recentLogs, olderLogs] = await Promise.all([
      WaterLog.find({ mac, createdAt: { $gte: fiveMinsAgo } }).lean(),
      WaterLog.find({ mac, createdAt: { $gte: tenMinsAgo, $lt: fiveMinsAgo } }).lean()
    ]);

    const avgRecent = recentLogs.length > 0 ? recentLogs.reduce((acc, curr) => acc + curr.level, 0) / recentLogs.length : wl;
    const avgOlder = olderLogs.length > 0 ? olderLogs.reduce((acc, curr) => acc + curr.level, 0) / olderLogs.length : wl;
    
    // อัตราการเปลี่ยนแปลง (cm ต่อชั่วโมง)
    // สูตร: (ค่าเฉลี่ยใหม่ - ค่าเฉลี่ยเก่า) * 12 (เพราะห่างกันช่วงละ 5 นาที)
    const calculatedTrend = (avgRecent - avgOlder) * 12;

    const status = wl >= (device.criticalThreshold || 10) ? "CRITICAL" : 
                   (wl >= (device.warningThreshold || 5) ? "WARNING" : "STABLE");

    // อัปเดตข้อมูลลง Device (รวม Trend เข้าไปด้วย)
    await Device.findOneAndUpdate({ mac }, { 
      waterLevel: wl, 
      temperature: Number(temperature) || 0,
      humidity: Number(humidity) || 0, 
      lastPing: new Date(), 
      status: status,
      trend: calculatedTrend // 🌟 เก็บค่าแนวโน้มลง DB
    });

    await WaterLog.create({ 
      mac, level: wl, signal: Number(signal) || 0,
      temperature: Number(temperature) || 0,
      air_humidity: Number(humidity) || 0, status: status 
    });

    // แจ้งเตือน Telegram
    if (device.isActive && status !== "STABLE") {
      const now = Date.now();
      const lastAlert = lastAlertTime.get(mac) || 0;
      
      if (now - lastAlert > ALERT_COOLDOWN) {
        const trendEmoji = calculatedTrend > 2 ? "📈" : (calculatedTrend < -2 ? "📉" : "➡️");
        const alertStatus = status === "CRITICAL" ? "🚨 ระดับน้ำวิกฤต!" : "⚠️ เฝ้าระวังน้ำสูง!";
        
        const msg = `<b>${alertStatus}</b>\n📍 ${device.name}\n🌊 ระดับ: ${wl.toFixed(2)} cm\n📊 แนวโน้ม: ${trendEmoji} ${calculatedTrend.toFixed(2)} cm/h\n🌡️ Temp: ${Number(temperature).toFixed(1)}°C`;
        
        await sendTelegramMessage(msg);
        lastAlertTime.set(mac, now);
      }
    }

    return NextResponse.json({ success: true, waterLevel: wl.toFixed(2), trend: calculatedTrend.toFixed(2) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}