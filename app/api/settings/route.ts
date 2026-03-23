import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/db/connect";
import Device from "@/db/models/Device";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const mac = searchParams.get('mac'); 

    // 🌟 ค่า Default (บังคับให้พ่นออกไปเสมอ)
    let config = {
      systemOn: true,
      buzzerOn: true,
      installHeight: 13.5,     
      warningThreshold: 9.0,   
      criticalThreshold: 11.0  
    };

    // 🌟 ไปค้นหาใน Database ว่าบอสตั้งค่าไว้เท่าไหร่
    if (mac) {
      const device = await Device.findOne({ mac });
      if (device) {
        config.systemOn = device.isActive !== false;
        config.installHeight = device.installHeight ?? 13.5;
        config.warningThreshold = device.warningThreshold ?? 9.0;
        config.criticalThreshold = device.criticalThreshold ?? 11.0;
      }
    }

    return NextResponse.json(config);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}