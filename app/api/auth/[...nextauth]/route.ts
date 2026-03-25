import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import connectDB from "@/db/connect";
import User from "@/db/models/User";
import * as bcrypt from "bcryptjs";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Admin System",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("กรุณากรอกข้อมูลให้ครบถ้วน"); 
        }

        try {
          await connectDB();

          // 1. หา User
          const user = await User.findOne({ username: credentials.username });
          if (!user) {
            console.log("Login fail: User not found");
            throw new Error("Username หรือ Password ไม่ถูกต้อง");
          }

          // 2. เทียบรหัสผ่าน
          const isPasswordMatch = await bcrypt.compare(credentials.password, user.password);
          if (!isPasswordMatch) {
            console.log("Login fail: Password incorrect");
            throw new Error("Username หรือ Password ไม่ถูกต้อง");
          }

          // 🌟🌟 3. จุดสำคัญ: เช็คการอนุมัติ (แก้เป็น isApproved แล้ว!) 🌟🌟
          // ถ้าไม่ใช่ admin และ isApproved เป็น false (ยังไม่อนุมัติ) ให้เตะออก
          if (user.role !== 'admin' && user.isApproved === false) {
            console.log("Login fail: Account not approved yet");
            throw new Error("บัญชีของคุณอยู่ระหว่างรอการอนุมัติจาก Admin"); 
          }

          // 4. ส่งข้อมูลกลับถ้าผ่านด่านทั้งหมด
          return { 
            id: user._id.toString(), 
            name: `${user.firstname} ${user.lastname}`,
            username: user.username,
            role: user.role,
            isApproved: user.isApproved // 💡 เปลี่ยนมาส่ง isApproved กลับไป
          };
          
        } catch (error: any) {
          console.error("Critical Login Error:", error);
          throw new Error(error.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ"); 
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.username = (user as any).username;
        token.isApproved = (user as any).isApproved; // 💡 เก็บลง token
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).username = token.username;
        (session.user as any).isApproved = token.isApproved; // 💡 ดึงจาก token มาใส่ session
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET || "MySuperSecretKeyFloodMonitor2026_ForAdminOnly",
  pages: {
    signIn: '/login', 
  }
});

export { handler as GET, handler as POST };