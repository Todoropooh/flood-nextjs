import mongoose from "mongoose";

// 📝 กำหนดโครงสร้างข้อมูลที่จะเก็บ
const SettingSchema = new mongoose.Schema({
  botToken: { type: String, default: "" },
  chatId: { type: String, default: "" },
  qrImage: { type: String, default: "/telegram.jpg" }, // เก็บเป็น Base64 หรือ Path
  systemOn: { type: Boolean, default: true },
  buzzerOn: { type: Boolean, default: true },
}, { 
  timestamps: true // ให้มันบันทึกเวลาที่อัปเดตด้วย
});

// 🚀 ส่งออก Model (ถ้ามีแล้วใช้ตัวเดิม ถ้าไม่มีให้สร้างใหม่)
export default mongoose.models.Setting || mongoose.model("Setting", SettingSchema);