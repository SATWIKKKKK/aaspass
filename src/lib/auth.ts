import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const authConfig: NextAuthConfig = {
  trustHost: true,
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
          isOwnerPremium: user.isOwnerPremium,
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
            (user as any).isOwnerPremium = existingUser.isOwnerPremium;
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
      // Handle owner premium upgrade via client-side session update
      if (trigger === "update" && session?.isOwnerPremium !== undefined) {
        token.isOwnerPremium = session.isOwnerPremium;
      }
      if (user) {
        token.id = (user as any).id || user.id;
        token.role = (user as any).role || "STUDENT";
        token.isPremium = (user as any).isPremium || false;
        token.isOwnerPremium = (user as any).isOwnerPremium || false;
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
            select: { id: true, role: true, isPremium: true, premiumExpiry: true, isOwnerPremium: true, ownerPremiumExpiry: true },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            // Check expiry — never trust isPremium without checking premiumExpiry
            token.isPremium =
              dbUser.isPremium &&
              !!dbUser.premiumExpiry &&
              new Date(dbUser.premiumExpiry) > new Date();
            token.isOwnerPremium =
              dbUser.isOwnerPremium &&
              !!dbUser.ownerPremiumExpiry &&
              new Date(dbUser.ownerPremiumExpiry) > new Date();
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
        (session.user as any).isOwnerPremium = token.isOwnerPremium;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Keep relative callback URLs and same-origin redirects intact.
      if (url.startsWith("/")) return `${baseUrl}${url}`;

      try {
        const target = new URL(url);
        if (target.origin === baseUrl) return url;
      } catch {
        // Ignore invalid URL and fall through to safe default.
      }

      // Always finish auth flows through role-aware redirect page.
      return `${baseUrl}/auth/redirect`;
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
