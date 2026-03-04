import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword, signSuperAdminToken, setSuperAdminCookie,
  checkRateLimit, recordFailedAttempt, clearAttempts,
} from "@/lib/superadmin-auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Rate limiting
    const rl = checkRateLimit(email.toLowerCase());
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Try again in ${rl.retryAfter} seconds.` },
        { status: 429 }
      );
    }

    // Find superadmin
    const admin = await prisma.superAdmin.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!admin) {
      recordFailedAttempt(email.toLowerCase());
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Verify password
    const valid = await verifyPassword(password, admin.passwordHash);
    if (!valid) {
      recordFailedAttempt(email.toLowerCase());
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Clear rate limit on success
    clearAttempts(email.toLowerCase());

    // Update last login
    await prisma.superAdmin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    });

    // Sign JWT and set cookie
    const token = signSuperAdminToken({ id: admin.id, email: admin.email, name: admin.name });
    await setSuperAdminCookie(token);

    return NextResponse.json({
      success: true,
      admin: { id: admin.id, name: admin.name, email: admin.email },
    });
  } catch (error) {
    console.error("Superadmin login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
