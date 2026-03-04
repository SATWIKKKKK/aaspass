import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, createAuditLog } from "@/lib/superadmin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.response) return authResult.response;

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
    const tab = url.searchParams.get("tab") || "warnings"; // warnings, suspensions

    if (tab === "suspensions") {
      const where: any = {};
      const filter = url.searchParams.get("filter") || "";
      if (filter === "active") where.isActive = true;

      const [suspensions, total] = await Promise.all([
        prisma.userSuspension.findMany({
          where,
          orderBy: { suspendedAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            user: { select: { id: true, name: true, email: true } },
            suspendedBy: { select: { name: true } },
          },
        }),
        prisma.userSuspension.count({ where }),
      ]);

      return NextResponse.json({
        suspensions,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }

    // Default: warnings
    const [warnings, total] = await Promise.all([
      prisma.userWarning.findMany({
        orderBy: { issuedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
          issuedBy: { select: { name: true } },
        },
      }),
      prisma.userWarning.count(),
    ]);

    return NextResponse.json({
      warnings,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Violations list error:", error);
    return NextResponse.json({ error: "Failed to fetch violations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.response) return authResult.response;

  try {
    const { userId, action, warningMessage, reason, expiresAt } = await req.json();

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (action === "warn") {
      await prisma.userWarning.create({
        data: {
          userId,
          warningMessage: warningMessage || "Warning issued by super admin",
          issuedById: authResult.admin.id,
        },
      });
      await createAuditLog({
        superadminId: authResult.admin.id,
        actionType: "WARN_USER",
        targetType: "USER",
        targetId: userId,
        targetName: user.name,
        afterValue: { warningMessage },
      });
      return NextResponse.json({ success: true, message: "Warning issued" });
    }

    if (action === "suspend") {
      const expiry = expiresAt ? new Date(expiresAt) : null;
      await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { isBlocked: true } }),
        prisma.userSuspension.create({
          data: {
            userId,
            reason: reason || "Suspended by super admin",
            suspendedById: authResult.admin.id,
            expiresAt: expiry,
          },
        }),
      ]);
      await createAuditLog({
        superadminId: authResult.admin.id,
        actionType: "SUSPEND_USER",
        targetType: "USER",
        targetId: userId,
        targetName: user.name,
        afterValue: { suspended: true, reason, expiresAt: expiry },
        reason,
      });
      return NextResponse.json({ success: true, message: "User suspended" });
    }

    if (action === "reinstate") {
      await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { isBlocked: false } }),
        prisma.userSuspension.updateMany({
          where: { userId, isActive: true },
          data: { isActive: false, reinstatedAt: new Date() },
        }),
      ]);
      await createAuditLog({
        superadminId: authResult.admin.id,
        actionType: "REINSTATE_USER",
        targetType: "USER",
        targetId: userId,
        targetName: user.name,
        reason,
      });
      return NextResponse.json({ success: true, message: "User reinstated" });
    }

    if (action === "ban") {
      await prisma.user.update({
        where: { id: userId },
        data: { isBlocked: true, name: `[Banned] ${user.name}` },
      });
      await prisma.userSuspension.create({
        data: {
          userId,
          reason: reason || "Permanently banned",
          suspendedById: authResult.admin.id,
          expiresAt: null,
        },
      });
      await createAuditLog({
        superadminId: authResult.admin.id,
        actionType: "BAN_USER",
        targetType: "USER",
        targetId: userId,
        targetName: user.name,
        reason,
      });
      return NextResponse.json({ success: true, message: "User banned" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Violations action error:", error);
    return NextResponse.json({ error: "Failed to process action" }, { status: 500 });
  }
}
