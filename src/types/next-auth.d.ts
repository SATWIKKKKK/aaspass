import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "STUDENT" | "OWNER" | "ADMIN";
      isPremium: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: "STUDENT" | "OWNER" | "ADMIN";
    isPremium: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: "STUDENT" | "OWNER" | "ADMIN";
    isPremium: boolean;
  }
}
