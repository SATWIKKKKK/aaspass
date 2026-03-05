import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, createAuditLog, hashPassword, verifyPassword } from "@/lib/superadmin-auth";
import { prisma } from "@/lib/prisma";

// GET - List all super admins
export async function GET(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.response) return authResult.response;

  try {
    const admins = await prisma.superAdmin.findMany({
      select: { id: true, name: true, email: true, isActive: true, createdAt: true, lastLogin: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ admins });
  } catch (error) {
    console.error("Settings error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

// POST - Add new super admin
export async function POST(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.response) return authResult.response;

  try {
    const { name, email, password } = await req.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const existing = await prisma.superAdmin.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const admin = await prisma.superAdmin.create({
      data: { name, email: email.toLowerCase(), passwordHash },
    });

    await createAuditLog({
      superadminId: authResult.admin.id,
      actionType: "CREATE_SUPERADMIN",
      targetType: "SUPERADMIN",
      targetId: admin.id,
      targetName: admin.name,
    });

    return NextResponse.json({ success: true, admin: { id: admin.id, name: admin.name, email: admin.email } });
  } catch (error) {
    console.error("Create admin error:", error);
    return NextResponse.json({ error: "Failed to create admin" }, { status: 500 });
  }
}

// PATCH - Change password for the current super admin
export async function PATCH(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.response) return authResult.response;

  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current and new password are required" }, { status: 400 });
    }
    if (newPassword.length < 12) {
      return NextResponse.json({ error: "New password must be at least 12 characters" }, { status: 400 });
    }

    // Fetch the admin with password hash
    const admin = await prisma.superAdmin.findUnique({
      where: { id: authResult.admin.id },
      select: { id: true, name: true, passwordHash: true },
    });
    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, admin.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
    }

    // Hash and update
    const newHash = await hashPassword(newPassword);
    await prisma.superAdmin.update({
      where: { id: admin.id },
      data: { passwordHash: newHash },
    });

    await createAuditLog({
      superadminId: admin.id,
      actionType: "UPDATE_SETTINGS",
      targetType: "SUPERADMIN",
      targetId: admin.id,
      targetName: admin.name,
      reason: "Password changed",
    });

    return NextResponse.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
