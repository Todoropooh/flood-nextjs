import mongoose, { Schema, Document, Model } from 'mongoose';

// 1. กำหนดโครงสร้าง Interface สำหรับ TypeScript (ต้องตรงกับ JSON จาก ESP32)
export interface IWaterLog extends Document {
  mac: string;           // รหัสประจำตัวเครื่อง (ESP32)
  level: number;         // ระดับน้ำ (cm)
  temperature: number;   // อุณหภูมิ (°C)
  air_humidity: number;  // ความชื้น (%)
  createdAt: Date;
}

// 2. กำหนด Schema สำหรับ MongoDB
const WaterLogSchema: Schema = new Schema({
  mac: { type: String, required: true },
  level: { type: Number, required: true },
  temperature: { type: Number, required: true },
  air_humidity: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

// 3. Export Model (เช็คว่ามี Model อยู่แล้วหรือยัง เพื่อป้องกัน Overwrite Error ใน Next.js)
const WaterLog: Model<IWaterLog> = mongoose.models.WaterLog || mongoose.model<IWaterLog>('WaterLog', WaterLogSchema);

export default WaterLog;