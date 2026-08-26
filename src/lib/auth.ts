import NextAuth, { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { getUserByEmail, verifyPassword, upsertGithubUser } from "@/lib/users";

const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000;

function checkRateLimit(email: string): { success: boolean; lockedUntil?: number } {
  const now = Date.now();
  const record = loginAttempts.get(email);
  if (!record) { loginAttempts.set(email, { count: 1, lastAttempt: now }); return { success: true }; }
  if (now - record.lastAttempt > RATE_LIMIT_WINDOW) { loginAttempts.set(email, { count: 1, lastAttempt: now }); return { success: true }; }
  const lockoutTime = record.lastAttempt + LOCKOUT_DURATION;
  if (record.count >= MAX_ATTEMPTS && now < lockoutTime) { return { success: false, lockedUntil: lockoutTime }; }
  record.count++; record.lastAttempt = now;
  return { success: true };
}

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: { params: { scope: "read:user user:email" } },
    }),
    CredentialsProvider({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.toLowerCase().trim();
        const rateCheck = checkRateLimit(email);
        if (!rateCheck.success) {
          throw new Error(`Account locked. Try again after ${Math.ceil((rateCheck.lockedUntil! - Date.now()) / 60000)} minutes`);
        }
        const user = getUserByEmail(email);
        if (!user) return null;
        if (!user.passwordHash) throw new Error("Please sign in with GitHub for this account");
        const isValid = await verifyPassword(user, credentials.password);
        if (!isValid) {
          const record = loginAttempts.get(email);
          if (record && record.count >= MAX_ATTEMPTS) throw new Error("Too many failed attempts. Account locked for 30 minutes");
          return null;
        }
        loginAttempts.delete(email);
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user) token.id = user.id;
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
        if (account.provider === "github" && profile) {
          token.username = (profile as any).login;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        session.user.accessToken = token.accessToken as string;
        (session.user as any).provider = token.provider as string;
        (session.user as any).username = token.username as string;
      }
      return session;
    },
    async signIn({ user, account }) {
      // Auto-create or upsert SQLite user on GitHub OAuth sign-in
      if (account?.provider === "github" && user.email) {
        await upsertGithubUser(user.email, user.name ?? null, user.image ?? null);
      }
      if (user.email) loginAttempts.delete(user.email.toLowerCase());
      return true;
    },
  },
  pages: { signIn: "/auth/signin", error: "/auth/error" },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
