import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/db/connect";
import WaterLog from "@/db/models/WaterLog";
import Device from "@/db/models/Device";

export const dynamic = 'force-dynamic';
const lastAlertTime = new Map<string, number>();
const ALERT_COOLDOWN = 1 * 60 * 1000;

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

    const currentLevel = Number(payload.level ?? 62.0);
    const currentTemp = Number(payload.temperature ?? 0);
    const currentHumid = Number(payload.air_humidity ?? payload.humidity ?? 0);
    const currentSignal = Number(payload.signal ?? 0);

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
      air_humidity: currentHumid,
      signal: currentSignal
    });

    // 🌟 Calibrate 62.0 (ให้เหมือนหน้าแรก)
    let wl = (62.0 - currentLevel);
    if (currentLevel <= 0.5 || currentLevel > 75) wl = 0;
    if (wl > 40) wl = 40;
    if (wl < 0) wl = 0;

    let lineStatus = "Normal";
    if (device.isActive) {
      let alertStatus = "";
      if (wl >= 10.0) alertStatus = "🚨 [อันตราย] ระดับน้ำวิกฤต!";
      else if (wl >= 5.0) alertStatus = "⚠️ [เฝ้าระวัง] ระดับน้ำสูงกว่าเกณฑ์!";

      if (alertStatus !== "") {
        const now = Date.now();
        const lastAlert = lastAlertTime.get(payload.mac) || 0;
        if (now - lastAlert > ALERT_COOLDOWN) {
          const alertMsg = `${alertStatus}\n📍 ${device.name}\n🌊 ระดับน้ำ: ${wl.toFixed(1)} cm\n🌡️ ${currentTemp.toFixed(1)}°C | 💧 ${currentHumid.toFixed(1)}%`;
          await sendLineMessage(alertMsg);
          lastAlertTime.set(payload.mac, now);
          lineStatus = "Sent Alert";
        }
      }
    }
    return NextResponse.json({ success: true, line_status: lineStatus });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
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