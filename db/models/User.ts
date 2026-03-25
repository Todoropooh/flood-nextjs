import mongoose, { Schema, Document, Model } from 'mongoose';

// กำหนด Interface สำหรับ TypeScript
export interface IUser extends Document {
  username: string;
  password: string;
  firstname: string;
  lastname: string;
  role: 'admin' | 'user';
  phone?: string;
  image?: string;
  isApproved: boolean; // 🌟 1. เพิ่มตรงนี้: เพื่อให้ TypeScript รู้จัก
  created_at: Date;
}

const UserSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  phone: { type: String },
  image: { type: String, default: '' }, 
  isApproved: { type: Boolean, default: false }, // 🌟 2. เพิ่มตรงนี้: บอกฐานข้อมูลให้เก็บสถานะการอนุมัติ (ค่าเริ่มต้นคือ false)
  created_at: { type: Date, default: Date.now }
});

// ตรวจสอบว่ามี Model อยู่แล้วหรือไม่ เพื่อป้องกันการสร้างซ้ำใน Next.js
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;