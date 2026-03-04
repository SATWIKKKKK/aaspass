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
    const filter = url.searchParams.get("filter") || "";

    const where: any = {};
    if (filter === "active") where.isActive = true;
    else if (filter === "manual") { where.grantType = "manual"; where.isActive = true; }
    else if (filter === "paid") { where.grantType = "paid"; where.isActive = true; }
    else if (filter === "expiring") {
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      where.isActive = true;
      where.expiryDate = { lte: weekFromNow, gt: new Date() };
    }

    const [grants, total, stats] = await Promise.all([
      prisma.premiumGrant.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true, isPremium: true } },
          grantedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.premiumGrant.count({ where }),
      Promise.all([
        prisma.user.count({ where: { isPremium: true } }),
        prisma.premiumGrant.count({ where: { grantType: "manual", isActive: true } }),
        prisma.premiumGrant.count({
          where: {
            isActive: true,
            expiryDate: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), gt: new Date() },
          },
        }),
      ]),
    ]);

    return NextResponse.json({
      grants,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      stats: {
        totalActivePremium: stats[0],
        manualGrants: stats[1],
        expiringIn7Days: stats[2],
      },
    });
  } catch (error) {
    console.error("Premium list error:", error);
    return NextResponse.json({ error: "Failed to fetch premium data" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.response) return authResult.response;

  try {
    const { userId, expiryDate, reason } = await req.json();

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const expiry = expiryDate ? new Date(expiryDate) : null;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { isPremium: true, premiumExpiry: expiry, subscriptionPlan: "manual" },
      }),
      prisma.premiumGrant.create({
        data: { userId, grantedById: authResult.admin.id, grantType: "manual", expiryDate: expiry },
      }),
    ]);

    await createAuditLog({
      superadminId: authResult.admin.id,
      actionType: "GRANT_PREMIUM",
      targetType: "USER",
      targetId: userId,
      targetName: user.name,
      afterValue: { premiumGranted: true, expiryDate: expiry },
      reason,
    });

    return NextResponse.json({ success: true, message: "Premium granted" });
  } catch (error) {
    console.error("Premium grant error:", error);
    return NextResponse.json({ error: "Failed to grant premium" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.response) return authResult.response;

  try {
    const { userId, action, reason, expiryDate } = await req.json();

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (action === "revoke") {
      await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { isPremium: false, premiumExpiry: null, subscriptionPlan: null } }),
        prisma.premiumGrant.updateMany({ where: { userId, isActive: true }, data: { isActive: false, revokedAt: new Date() } }),
      ]);
      await createAuditLog({
        superadminId: authResult.admin.id,
        actionType: "REVOKE_PREMIUM",
        targetType: "USER",
        targetId: userId,
        targetName: user.name,
        reason,
      });
      return NextResponse.json({ success: true, message: "Premium revoked" });
    }

    if (action === "extend") {
      const newExpiry = expiryDate ? new Date(expiryDate) : null;
      await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { premiumExpiry: newExpiry } }),
        prisma.premiumGrant.updateMany({
          where: { userId, isActive: true },
          data: { expiryDate: newExpiry },
        }),
      ]);
      await createAuditLog({
        superadminId: authResult.admin.id,
        actionType: "EXTEND_PREMIUM",
        targetType: "USER",
        targetId: userId,
        targetName: user.name,
        afterValue: { newExpiry },
        reason,
      });
      return NextResponse.json({ success: true, message: "Premium extended" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Premium update error:", error);
    return NextResponse.json({ error: "Failed to update premium" }, { status: 500 });
  }
}
