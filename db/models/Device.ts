import mongoose from 'mongoose';

const DeviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mac: { type: String, required: true, unique: true }, 
  
  // 🌟 ข้อมูลตำแหน่ง (ปลดล็อกเพื่อความยืดหยุ่น)
  location: { type: String, default: '' }, 
  
  type: { type: String, default: 'ESP32' },
  status: { type: String, default: 'Offline' },
  image: { type: String, default: '' }, 
  
  // 📍 พิกัด GPS สำหรับแสดงผลบนแผนที่ (Default: สุรินทร์)
  lat: { type: Number, default: 14.8824 }, 
  lng: { type: Number, default: 103.4936 }, 
  
  // 🟢 ขีดจำกัดการแจ้งเตือน
  warningThreshold: { type: Number, default: 3.0 },
  criticalThreshold: { type: Number, default: 7.0 },

  // 📊 ข้อมูลล่าสุดจากเซ็นเซอร์
  waterLevel: { type: Number, default: 0 },
  temperature: { type: Number, default: 0 },
  humidity: { type: Number, default: 0 },

  // 📡 การเชื่อมต่อ
  lastPing: { type: Date, default: Date.now },

  // 🎛️ [NEW] ส่วนการควบคุมจากระยะไกล (Remote Control)
  // ใช้สำหรับสั่ง เปิด-ปิด การทำงานของโหนดนั้นๆ ผ่านหน้าเว็บ
  isActive: { 
    type: Boolean, 
    default: true 
  },
  
  // ใช้สำหรับสั่ง Mute/Unmute เสียง Buzzer จากหน้าเว็บ
  isBuzzerEnabled: { 
    type: Boolean, 
    default: true 
  }

}, { timestamps: true });

export default mongoose.models.Device || mongoose.model('Device', DeviceSchema);