export async function POST(request: NextRequest) {
  try {
    const payload = await request.json(); 
    // 💡 ปรับการรับค่าให้ยืดหยุ่นขึ้น
    const { mac, level, temperature, humidity, air_humidity, signal } = payload;
    
    if (!mac) return NextResponse.json({ error: "MAC Required" }, { status: 400 });

    await connectDB();
    const device = await Device.findOne({ mac });
    if (!device) return NextResponse.json({ error: "Device not found" }, { status: 404 });

    // 🌊 Logic คำนวณระดับน้ำ
    const h = device.installHeight ?? 13.5;
    const warnLimit = device.warningThreshold ?? 2.8;
    const critLimit = device.criticalThreshold ?? 3.0;

    // มั่นใจว่าเป็นตัวเลขเสมอ
    const currentDist = Number(level) || h; 
    const currentTemp = Number(temperature) || 0;
    const currentHumid = Number(air_humidity ?? humidity) || 0;
    const currentSignal = Number(signal) || 0;

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

    // 📝 บันทึกข้อมูล (ใส่ค่า Default ป้องกัน Error 500)
    await Device.findOneAndUpdate({ mac }, { 
      waterLevel: currentDist, 
      temperature: currentTemp, 
      humidity: currentHumid, 
      status: currentStatus, 
      lastPing: new Date() 
    });

    await WaterLog.create({ 
      mac, 
      level: currentDist, 
      temperature: currentTemp, 
      air_humidity: currentHumid, 
      signal: currentSignal, 
      status: currentStatus 
    });

    // 🔔 ส่ง Telegram แจ้งเตือน
    let telStatus = "Normal";
    if (device.isActive && alertStatus !== "") {
      const now = Date.now();
      const lastAlert = lastAlertTime.get(mac) || 0;
      if (now - lastAlert > ALERT_COOLDOWN) {
        const msg = `<b>${alertStatus}</b>\n\n📍 สถานี: <b>${device.name}</b>\n🌊 ระดับน้ำ: <code>${wl.toFixed(2)} cm</code>\n🌡️ อุณหภูมิ: ${currentTemp.toFixed(1)}°C\n📡 สัญญาณ: ${currentSignal}%`;
        await sendTelegramMessage(msg);
        lastAlertTime.set(mac, now);
        telStatus = "Sent Telegram";
      }
    }

    return NextResponse.json({ 
      success: true, 
      waterLevel: wl.toFixed(2), 
      status: currentStatus, 
      telegram: telStatus 
    });
  } catch (error: any) {
    console.error("❌ API ERROR 500:", error.message); // ดูใน Vercel Logs จะเห็นชัดเลย
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}