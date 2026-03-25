import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/db/connect";
import WaterLog from "@/db/models/WaterLog";
import Device from "@/db/models/Device";

export const dynamic = 'force-dynamic';

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

    const logs = await WaterLog.find(query).sort({ createdAt: 1 }).limit(1000);
    return NextResponse.json(logs || []); 
  } catch (error: any) {
    return NextResponse.json([]); 
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json(); 
    const { mac, level, signal, temperature, air_humidity } = payload;
    if (!mac) return NextResponse.json({ error: "MAC Required" }, { status: 400 });

    await connectDB();
    const device = await Device.findOne({ mac });
    if (!device) return NextResponse.json({ error: "Device not found" }, { status: 404 });

    // 📏 คำนวณระดับน้ำจากพื้น (Logic ที่พี่ต้องการ)
    const h = Number(device.installHeight) || 12.6; 
    const currentDist = Number(level) || h;
    let wl = h - currentDist; 
    if (currentDist >= (h - 0.2)) wl = 0; // ถ้าน้ำแห้งหรือเซนเซอร์ยิงถึงพื้น
    if (wl < 0) wl = 0;
    if (wl > h) wl = h;

    // 🚦 สถานะ
    const status = wl >= (device.criticalThreshold || 5) ? "CRITICAL" : 
                   (wl >= (device.warningThreshold || 2) ? "WARNING" : "STABLE");

    // 📝 อัปเดต Device และบันทึก Log
    await Device.findOneAndUpdate({ mac }, { 
      waterLevel: wl, 
      lastPing: new Date(),
      status: status
    });

    await WaterLog.create({ 
      mac, 
      level: wl, 
      signal: signal || 0,
      temperature: temperature || 0,
      air_humidity: air_humidity || 0,
      status: status 
    });

    return NextResponse.json({ success: true, waterLevel: wl.toFixed(2) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}