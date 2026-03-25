import mongoose from 'mongoose';

const DeviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mac: { type: String, required: true, unique: true }, 
  
  // 🌟 ข้อมูลตำแหน่ง
  location: { type: String, default: '' }, 
  
  type: { type: String, default: 'ESP32' },
  status: { type: String, default: 'Offline' },
  image: { type: String, default: '' }, 
  
  // 📍 พิกัด GPS
  lat: { type: Number, default: 14.8824 }, 
  lng: { type: Number, default: 103.4936 }, 
  
  // 📏 ระยะติดตั้งเซนเซอร์จากพื้น (Install Height)
  installHeight: { 
    type: Number, 
    default: 62.0 
  },

  // 🟢 ขีดจำกัดการแจ้งเตือน (เกณฑ์สีส้ม/แดง)
  warningThreshold: { type: Number, default: 5.0 },
  criticalThreshold: { type: Number, default: 10.0 },

  // 📊 ข้อมูลล่าสุดจากเซ็นเซอร์
  waterLevel: { type: Number, default: 0 },
  temperature: { type: Number, default: 0 },
  humidity: { type: Number, default: 0 },

  // 📈 [NEW] แนวโน้มระดับน้ำ (cm/h) ที่คำนวณจาก API
  trend: { 
    type: Number, 
    default: 0 
  },

  // 📡 การเชื่อมต่อ
  lastPing: { type: Date, default: Date.now },

  // 🎛️ ส่วนการควบคุมจากระยะไกล (Remote Control)
  isActive: { 
    type: Boolean, 
    default: true 
  },
  
  isBuzzerEnabled: { 
    type: Boolean, 
    default: true 
  },

  // 📱 [NEW] ระบบ SMS
  isSmsEnabled: { 
    type: Boolean, 
    default: true 
  },
  
  phoneNumber: { 
    type: String, 
    default: '' 
  }

}, { timestamps: true });

export default mongoose.models.Device || mongoose.model('Device', DeviceSchema);