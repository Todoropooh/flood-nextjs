import mongoose, { Schema, Document, Model } from 'mongoose';

// 1. Interface สำหรับ TypeScript
export interface IWaterLog extends Document {
  mac: string;
  level: number;
  temperature: number;
  air_humidity: number;
  signal: number;   // 🌟 เพิ่มฟิลด์นี้
  status: string;   // 🌟 เพิ่มฟิลด์นี้
  createdAt: Date;
}

// 2. Schema สำหรับ MongoDB
const WaterLogSchema: Schema = new Schema({
  mac: { type: String, required: true },
  level: { type: Number, default: 0 },         // ใช้ default แทน required เพื่อป้องกัน Error 500
  temperature: { type: Number, default: 0 },
  air_humidity: { type: Number, default: 0 },
  signal: { type: Number, default: 0 },        // 🌟 เพิ่มให้รองรับค่าจาก ESP32
  status: { type: String, default: "STABLE" },  // 🌟 เพิ่มให้รองรับสถานะ
  createdAt: { type: Date, default: Date.now }
});

// 3. Export Model
const WaterLog: Model<IWaterLog> = mongoose.models.WaterLog || mongoose.model<IWaterLog>('WaterLog', WaterLogSchema);

export default WaterLog;