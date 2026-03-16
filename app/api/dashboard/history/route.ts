import { NextResponse } from 'next/server';
import connectDB from '@/db/connect';
import WaterLog from '@/db/models/WaterLog';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    // ดึงข้อมูลล่าสุด 20 รายการเพื่อมาทำกราฟ
    const logs = await WaterLog.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    
    // เรียงจากเก่าไปใหม่เพื่อให้กราฟวิ่งจากซ้ายไปขวา
    return NextResponse.json(logs.reverse());
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}