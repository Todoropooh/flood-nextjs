import { NextResponse } from 'next/server';
import connectDB from '@/db/connect';
import Device from '@/db/models/Device';

export async function POST(req: Request) {
  try {
    await connectDB();
    const { mac } = await req.json();
    if (!mac) return NextResponse.json({ error: 'No MAC' }, { status: 400 });

    const device = await Device.findOneAndUpdate(
      { mac },
      { lastPing: new Date(), status: 'Online' },
      { new: true, upsert: true } // ถ้าไม่มีเครื่องนี้ ให้สร้างใหม่เลย
    );

    return NextResponse.json({ message: 'Online', device });
  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}