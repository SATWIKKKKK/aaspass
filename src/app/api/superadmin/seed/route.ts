import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/superadmin-auth";

/**
 * POST /api/superadmin/seed
 *
 * Creates the initial super admin account.
 * Uses SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD env vars, or sensible defaults.
 * Safe to call multiple times — skips if an account already exists.
 *
 * This endpoint is intentionally unprotected so it can be called once
 * during first-time setup before any admin exists. It self-disables
 * after the first admin is created.
 */
export async function POST(req: NextRequest) {
  try {
    // Check if any super admin already exists — if so, block further seeding
    const existingCount = await prisma.superAdmin.count();
    if (existingCount > 0) {
      return NextResponse.json(
        { error: "Super admin account(s) already exist. Seed endpoint is disabled." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const email = (
      body.email || process.env.SUPERADMIN_EMAIL || "superadmin@aaspass.com"
    ).toLowerCase().trim();

    const password =
      body.password || process.env.SUPERADMIN_PASSWORD || "SuperAdmin@2025!";

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const admin = await prisma.superAdmin.create({
      data: {
        email,
        name: "Super Admin",
        passwordHash,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Super admin account created successfully",
      admin: { id: admin.id, email: admin.email, name: admin.name },
      credentials: { email, password },
    });
  } catch (error: any) {
    // Handle unique constraint (duplicate email)
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "An admin with that email already exists" },
        { status: 409 }
      );
    }
    console.error("Seed endpoint error:", error);
    return NextResponse.json(
      { error: "Failed to create super admin account" },
      { status: 500 }
    );
  }
}
