import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json(); 
    const CHAT_ID = "8044413286"; // 🌟 Chat ID ของพี่ Suthikiat

    if (!token) return NextResponse.json({ success: false, error: "กรุณาใส่ Token" }, { status: 400 });

    // 🛰️ ส่งข้อความทดสอบหา Telegram
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: "<b>🚀 Test Connection Success!</b>\n\nยินดีด้วยครับพี่! ระบบ Telegram Alert เชื่อมต่อกับบอท <b>Project_SRRU_Flood_Bot</b> สำเร็จแล้วครับ!",
        parse_mode: "HTML"
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.description }, { status: 400 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}