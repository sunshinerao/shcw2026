import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import {
  getNextAuthSecret,
  isAuthDebugEnabled,
  isSecureCookieEnabled,
  SESSION_COOKIE_NAME,
} from "./auth-config";

const authDebugEnabled = isAuthDebugEnabled();

function logAuthDebug(...args: unknown[]) {
  if (authDebugEnabled) {
    console.log(...args);
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  secret: getNextAuthSecret(),
  debug: authDebugEnabled,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: SESSION_COOKIE_NAME,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isSecureCookieEnabled(),
      },
    },
  },
  pages: {
    signIn: "/auth/login",
    signOut: "/",
    error: "/auth/error",
    newUser: "/auth/register",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        logAuthDebug("Authorize called with:", credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          logAuthDebug("Missing credentials");
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          logAuthDebug("User found:", user ? "yes" : "no");

          if (!user || !user.password) {
            logAuthDebug("User not found or no password");
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          logAuthDebug("Password valid:", isPasswordValid);

          if (!isPasswordValid) {
            return null;
          }

          if (user.status !== "ACTIVE") {
            throw new Error("Account is not active");
          }

          const userData = {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.avatar,
            role: user.role,
            passCode: user.passCode,
          };
          
          logAuthDebug("Returning user:", userData.email);
          return userData;
        } catch (error) {
          console.error("Authorize error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      logAuthDebug("JWT callback - user:", user ? "present" : "absent", "token sub:", token.sub);
      
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.passCode = user.passCode;
        token.sub = user.id; // 确保 sub 设置为 user.id
        token.name = user.name;
        // avatar is intentionally NOT stored in the JWT token —
        // avatars are base64 data URLs that would bloat the cookie
        // past Vercel's 8 KB header limit (494 REQUEST_HEADER_TOO_LARGE).
      }

      if (trigger === "update" && session) {
        if (session.name !== undefined) {
          token.name = session.name;
        }
        if (session.role !== undefined) {
          token.role = session.role;
        }
      }

      // Periodically refresh role from database
      if (token.sub) {
        const lastRoleCheck = (token.roleCheckedAt as number) || 0;
        const now = Date.now();
        if (now - lastRoleCheck > 5 * 60 * 1000) {
          try {
            const freshUser = await prisma.user.findUnique({
              where: { id: token.sub },
              select: { role: true, status: true },
            });
            if (freshUser) {
              token.role = freshUser.role;
              if (freshUser.status !== "ACTIVE") {
                token.id = undefined;
                token.sub = undefined;
                return token;
              }
            }
            token.roleCheckedAt = now;
          } catch {
            // On DB error, keep existing token
          }
        }
      }
      return token;
    },
    async session({ session, token, user }) {
      logAuthDebug("Session callback - token sub:", token.sub);
      
      if (token && session.user) {
        session.user.id = token.sub as string || token.id as string;
        session.user.role = token.role as string;
        session.user.passCode = token.passCode as string;
        session.user.name = (token.name as string) || session.user.name;
        // image is not populated from JWT — fetched separately via /api/user/profile
      }
      return session;
    },
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      logAuthDebug("Sign in event:", user.email);
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date() },
        });
      } catch (error) {
        console.error("Sign in event error:", error);
      }
    },
  },
};
