import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, createAuditLog, hashPassword } from "@/lib/superadmin-auth";
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
