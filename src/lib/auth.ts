import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please provide email and password");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) {
          throw new Error("Invalid credentials");
        }

        if (user.isBlocked) {
          throw new Error("Your account has been blocked. Contact support.");
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          // Never put base64 images in the JWT — it bloats the cookie past header limits (431)
          image: user.image && !user.image.startsWith('data:') ? user.image : null,
          role: user.role,
          isPremium: user.isPremium,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Handle Google OAuth sign-in: create user in DB if not exists
      if (account?.provider === "google" && user.email) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });
          if (!existingUser) {
            // Create a new user for Google OAuth
            const newUser = await prisma.user.create({
              data: {
                name: user.name || "User",
                email: user.email,
                image: user.image,
                password: "", // No password for OAuth users
                role: "STUDENT",
              },
            });
            (user as any).id = newUser.id;
            (user as any).role = newUser.role;
            (user as any).isPremium = newUser.isPremium;
          } else {
            (user as any).id = existingUser.id;
            (user as any).role = existingUser.role;
            (user as any).isPremium = existingUser.isPremium;
          }
        } catch (error) {
          console.error("Google sign-in DB error:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      // Handle client-side session update (e.g. role change after Google OAuth registration)
      if (trigger === "update" && session?.role) {
        token.role = session.role;
      }
      // Handle premium upgrade via client-side session update
      if (trigger === "update" && session?.isPremium !== undefined) {
        token.isPremium = session.isPremium;
      }
      if (user) {
        token.id = (user as any).id || user.id;
        token.role = (user as any).role || "STUDENT";
        token.isPremium = (user as any).isPremium || false;
      }
      // Strip large image data from JWT to keep cookie small (prevents 431)
      if (token.picture && typeof token.picture === 'string' && token.picture.startsWith('data:')) {
        delete token.picture;
      }
      if (token.image && typeof token.image === 'string' && (token.image as string).startsWith('data:')) {
        delete token.image;
      }
      // For Google OAuth, look up the user from DB to get role/premium
      if (account?.provider === "google" && token.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email as string },
            select: { id: true, role: true, isPremium: true, premiumExpiry: true },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            // Check expiry — never trust isPremium without checking premiumExpiry
            token.isPremium =
              dbUser.isPremium &&
              !!dbUser.premiumExpiry &&
              new Date(dbUser.premiumExpiry) > new Date();
          }
        } catch {
          // Ignore DB errors in JWT callback
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).isPremium = token.isPremium;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // After sign-in, always route through the auth/redirect page for role-based routing
      if (url.startsWith(baseUrl) || url.startsWith("/")) {
        // If the url is the base URL or root, redirect through role-based router
        if (url === baseUrl || url === baseUrl + "/" || url === "/" || url.includes("/api/auth")) {
          return `${baseUrl}/auth/redirect`;
        }
      }
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
