import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/db/connect";
import Device from "@/db/models/Device";
import Setting from "@/db/models/Setting"; // 🌟 ดึง Model สำหรับเก็บค่าระบบส่วนกลาง

export const dynamic = 'force-dynamic';

// 🔍 ดึงค่าการตั้งค่า (GET)
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const mac = searchParams.get('mac'); 

    // 🌟 1. ดึงค่าส่วนกลาง (Telegram & System) จาก Model Setting
    // ใส่ .lean() เพื่อให้มันแปลงเป็น Object ธรรมดา จะได้ไม่ต้องใช้ ._doc
    let globalSettings = await Setting.findOne({}).lean(); 
    
    // ถ้ายังไม่มีใน DB ให้ใช้ค่า Default
    if (!globalSettings) {
      globalSettings = {
        botToken: "8130732948:AAFNf-e3dWlPXvdccuE-C9hx2LZ_DLtGUMQ",
        chatId: "8044413286",
        qrImage: "/telegram.jpg", // รูปเริ่มต้น
        systemOn: true,
        buzzerOn: true
      };
    }

    // 🌟 2. ประกอบร่าง Object เตรียมส่งกลับไป
    let config: any = {
      ...globalSettings, // เอาค่าส่วนกลางตั้งต้น
      installHeight: 13.5,     
      warningThreshold: 2.8,   
      criticalThreshold: 3.0   
    };

    // 🌟 3. ถ้ามีการส่ง MAC มา ให้ดึงค่าเจาะจงของ Device นั้นๆ ไปทับ
    if (mac) {
      const device = await Device.findOne({ mac }).lean();
      if (device) {
        config.systemOn = device.isActive !== false;
        config.installHeight = device.installHeight ?? 13.5;
        config.warningThreshold = device.warningThreshold ?? 2.8;
        config.criticalThreshold = device.criticalThreshold ?? 3.0;
      }
    }

    return NextResponse.json(config);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 💾 บันทึกค่าการตั้งค่า (POST) - สำหรับหน้า Admin กด Save
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const data = await request.json();

    // บันทึกหรืออัปเดตค่าส่วนกลาง (Telegram, QR, System Status)
    // upsert: true คือถ้าไม่มีให้สร้างใหม่ ถ้ามีให้ทับตัวเดิม
    await Setting.findOneAndUpdate({}, data, { upsert: true, new: true });

    return NextResponse.json({ success: true, message: "บันทึกการตั้งค่าเรียบร้อย" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}