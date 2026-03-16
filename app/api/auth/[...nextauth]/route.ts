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
          return null;
        }

        try {
          await connectDB();

          // 1. หา User
          const user = await User.findOne({ username: credentials.username });
          if (!user) {
            console.log("Login fail: User not found");
            return null; 
          }

          // 2. เทียบรหัสผ่าน
          const isPasswordMatch = await bcrypt.compare(credentials.password, user.password);
          if (!isPasswordMatch) {
            console.log("Login fail: Password incorrect");
            return null;
          }

          // 3. ส่งข้อมูลกลับ
          return { 
            id: user._id.toString(), 
            name: `${user.firstname} ${user.lastname}`,
            username: user.username,
            role: user.role
          };
          
        } catch (error) {
          console.error("Critical Login Error:", error);
          return null;
        }
      }
    })
  ],
  // 🌟 เพิ่มบรรทัดนี้เพื่อความชัวร์ใน Next.js 16
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.username = (user as any).username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).username = token.username;
      }
      return session;
    }
  },
  // 🌟 แนะนำให้ใส่รหัสลับใน .env แต่ถ้าจะใส่ตรงนี้เลยต้องมั่นใจว่าค่าไม่ว่าง
  secret: process.env.NEXTAUTH_SECRET || "MySuperSecretKeyFloodMonitor2026_ForAdminOnly",
  pages: {
    signIn: '/login', 
  }
});

export { handler as GET, handler as POST };