import { NextAuthOptions, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectToDatabase } from "@/lib/db";
import UserModel from "@/lib/models/user";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Brute-force protection
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

// Dummy hash so missing users still take ~same time as a real bcrypt compare
const DUMMY_HASH =
  "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G2oQ.eKzqKzqKe";

function checkRateLimit(key: string): { success: boolean; lockedUntil?: number } {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record) {
    loginAttempts.set(key, { count: 1, lastAttempt: now });
    return { success: true };
  }

  if (now - record.lastAttempt > RATE_LIMIT_WINDOW) {
    loginAttempts.set(key, { count: 1, lastAttempt: now });
    return { success: true };
  }

  const lockoutTime = record.lastAttempt + LOCKOUT_DURATION;
  if (record.count >= MAX_ATTEMPTS && now < lockoutTime) {
    return { success: false, lockedUntil: lockoutTime };
  }

  record.count++;
  record.lastAttempt = now;
  return { success: true };
}

function normalizeLoginId(raw: string): string {
  const value = raw.toLowerCase().trim();
  // Allow signing in as "vincent" for the provisioned account
  if (value === "vincent") return "vincent@admin.com";
  return value;
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Credentials only — no public OAuth signup
    CredentialsProvider({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<User | null> {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = normalizeLoginId(credentials.email);
        const rateKey = crypto.createHash("sha256").update(email).digest("hex");

        const rateCheck = checkRateLimit(rateKey);
        if (!rateCheck.success) {
          throw new Error(
            `Account locked. Try again after ${Math.ceil((rateCheck.lockedUntil! - Date.now()) / 60000)} minutes`
          );
        }

        try {
          await connectToDatabase();
          const user = await UserModel.findOne({ email });

          const hash = user?.password || DUMMY_HASH;
          const isValid = await bcrypt.compare(credentials.password, hash);

          if (!user || !user.password || !isValid) {
            const record = loginAttempts.get(rateKey);
            if (record && record.count >= MAX_ATTEMPTS) {
              throw new Error("Too many failed attempts. Account locked for 30 minutes");
            }
            return null;
          }

          loginAttempts.delete(rateKey);

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            image: user.image,
          };
        } catch (error) {
          if (error instanceof Error && error.message.includes("locked")) {
            throw error;
          }
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
    updateAge: 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  events: {
    async signIn({ user }) {
      if (user.email) {
        const rateKey = crypto
          .createHash("sha256")
          .update(user.email.toLowerCase())
          .digest("hex");
        loginAttempts.delete(rateKey);
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  // Avoid noisy console warnings; set NEXTAUTH_DEBUG=1 to troubleshoot auth
  debug: process.env.NEXTAUTH_DEBUG === "1",
};
