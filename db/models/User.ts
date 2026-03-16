import mongoose, { Schema, Document, Model } from 'mongoose';

// กำหนด Interface สำหรับ TypeScript
export interface IUser extends Document {
  username: string;
  password: string;
  firstname: string;
  lastname: string;
  role: 'admin' | 'user';
  phone?: string;
  image?: string; // 🌟 เพิ่มตรงนี้: รองรับการเก็บรูปภาพโปรไฟล์ (Base64)
  created_at: Date;
}

const UserSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  phone: { type: String },
  image: { type: String, default: '' }, // 🌟 เพิ่มตรงนี้: บอกฐานข้อมูลให้เตรียมพื้นที่เก็บรูป
  created_at: { type: Date, default: Date.now }
});

// ตรวจสอบว่ามี Model อยู่แล้วหรือไม่ เพื่อป้องกันการสร้างซ้ำใน Next.js
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;