import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SUPERADMIN_JWT_SECRET = process.env.SUPERADMIN_JWT_SECRET || "superadmin-fallback-secret-change-me";
const COOKIE_NAME = "superadmin_token";
const TOKEN_EXPIRY = "2h";
const SALT_ROUNDS = 12;

export interface SuperAdminPayload {
  id: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

// ─── Token Management ───

export function signSuperAdminToken(payload: { id: string; email: string; name: string }): string {
  return jwt.sign(payload, SUPERADMIN_JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifySuperAdminToken(token: string): SuperAdminPayload | null {
  try {
    return jwt.verify(token, SUPERADMIN_JWT_SECRET) as SuperAdminPayload;
  } catch {
    return null;
  }
}

// ─── Cookie Management ───

export async function setSuperAdminCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // lax allows first-party navigation after form POST / fetch
    maxAge: 2 * 60 * 60, // 2 hours
    path: "/",
  });
}

export async function clearSuperAdminCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSuperAdminFromCookie(): Promise<SuperAdminPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySuperAdminToken(token);
}

// ─── Password Hashing ───

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── API Route Protection ───

export async function requireSuperAdmin(req?: NextRequest): Promise<{
  admin: SuperAdminPayload;
  response?: never;
} | {
  admin?: never;
  response: NextResponse;
}> {
  // Try cookie first (for page routes)
  let token: string | undefined;
  
  if (req) {
    token = req.cookies.get(COOKIE_NAME)?.value;
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get(COOKIE_NAME)?.value;
  }

  if (!token) {
    return {
      response: NextResponse.json(
        { error: "Unauthorized — no token" },
        { status: 401 }
      ),
    };
  }

  const payload = verifySuperAdminToken(token);
  if (!payload) {
    return {
      response: NextResponse.json(
        { error: "Unauthorized — invalid or expired token" },
        { status: 401 }
      ),
    };
  }

  // Verify the superadmin still exists in DB
  const exists = await prisma.superAdmin.findUnique({
    where: { id: payload.id },
    select: { id: true },
  });

  if (!exists) {
    return {
      response: NextResponse.json(
        { error: "Unauthorized — superadmin not found" },
        { status: 401 }
      ),
    };
  }

  return { admin: payload };
}

// ─── Rate Limiting (in-memory, simple) ───

const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

export function checkRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = loginAttempts.get(identifier);

  if (record) {
    if (record.lockedUntil > now) {
      return { allowed: false, retryAfter: Math.ceil((record.lockedUntil - now) / 1000) };
    }
    if (record.lockedUntil <= now && record.count >= 5) {
      // Lockout expired, reset
      loginAttempts.delete(identifier);
    }
  }

  return { allowed: true };
}

export function recordFailedAttempt(identifier: string) {
  const now = Date.now();
  const record = loginAttempts.get(identifier) || { count: 0, lockedUntil: 0 };
  record.count += 1;

  if (record.count >= 5) {
    record.lockedUntil = now + 15 * 60 * 1000; // 15 minutes
  }

  loginAttempts.set(identifier, record);
}

export function clearAttempts(identifier: string) {
  loginAttempts.delete(identifier);
}

// ─── Audit Logging ───

export async function createAuditLog(params: {
  superadminId: string;
  actionType: string;
  targetType: string;
  targetId: string;
  targetName?: string;
  beforeValue?: any;
  afterValue?: any;
  reason?: string;
}) {
  return prisma.auditLog.create({
    data: {
      superadminId: params.superadminId,
      actionType: params.actionType,
      targetType: params.targetType,
      targetId: params.targetId,
      targetName: params.targetName,
      beforeValue: params.beforeValue ? JSON.stringify(params.beforeValue) : null,
      afterValue: params.afterValue ? JSON.stringify(params.afterValue) : null,
      reason: params.reason,
    },
  });
}
