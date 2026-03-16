import mongoose, { Schema, Document, Model } from 'mongoose';

// 1. สร้าง Interface เพื่อบอก TypeScript ว่าข้อมูลมีอะไรบ้าง
export interface IIotData extends Document {
  device_id: string;
  water_level: number;
  air_humidity: number;
  temperature: number;
  alert_status: 'Normal' | 'Warning' | 'Critical';
  created_at: Date;
}

// 2. สร้าง Schema สำหรับ MongoDB
const IotDataSchema: Schema = new Schema({
  device_id: { type: String, required: true },
  water_level: { type: Number, required: true },
  air_humidity: { type: Number, required: true },
  temperature: { type: Number, required: true }, // เพิ่มอุณหภูมิแล้ว!
  alert_status: { 
    type: String, 
    enum: ['Normal', 'Warning', 'Critical'], 
    default: 'Normal' 
  },
  created_at: { type: Date, default: Date.now }
});

// 3. Export Model
const IotData: Model<IIotData> = mongoose.models.IotData || mongoose.model<IIotData>('IotData', IotDataSchema);
export default IotData;