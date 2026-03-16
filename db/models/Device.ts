import mongoose from 'mongoose';

const DeviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mac: { type: String, required: true, unique: true }, 
  
  // 🌟 ปลดล็อก required ออก เพื่อไม่ให้เกิด Error 500 เวลาไม่ได้กรอก
  location: { type: String, default: '' }, 
  
  type: { type: String, default: 'ESP32' },
  status: { type: String, default: 'Offline' },
  image: { type: String, default: '' }, 
  
  // 📍 พิกัดตำแหน่งอุปกรณ์ (ของเดิมคุณ)
  lat: { type: Number, default: 14.8824 }, 
  lng: { type: Number, default: 103.4936 }, 
  
  // 🟢 2 ฟิลด์สำหรับตั้งค่าลิมิตการแจ้งเตือน (Threshold)
  warningThreshold: { type: Number, default: 3.0 },
  criticalThreshold: { type: Number, default: 7.0 },

  // 🌟 เพิ่ม 3 ฟิลด์นี้เข้ามา! (สำคัญมาก เพื่อให้หน้า Dashboard ดึงค่าล่าสุดไปโชว์ได้)
  waterLevel: { type: Number, default: 0 },
  temperature: { type: Number, default: 0 },
  humidity: { type: Number, default: 0 },

  // 📡 การเชื่อมต่อ
  lastPing: { type: Date, default: Date.now }, 
}, { timestamps: true });

export default mongoose.models.Device || mongoose.model('Device', DeviceSchema);