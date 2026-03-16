// lib/mongodb.ts
import mongoose from 'mongoose';

// ดึงรหัสเชื่อมต่อจากไฟล์ .env
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// ระบบ Cache ป้องกันการต่อ Database ซ้ำหลายรอบเวลา Refresh หน้าเว็บ
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      console.log('✅ MongoDB Connected Successfully!');
      return mongoose;
    });
  }
  
  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectDB;