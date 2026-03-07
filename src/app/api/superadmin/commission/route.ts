import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { prisma } from "@/lib/prisma";

// GET /api/superadmin/commission — list owners with commission rates
export async function GET(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.response) return authResult.response;

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
    const search = url.searchParams.get("search") || "";

    const where: any = { role: "OWNER" };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [owners, total, globalConfig] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, phone: true,
          commissionPercentage: true, isOwnerPremium: true,
          createdAt: true,
          _count: { select: { properties: true, bookings: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
      prisma.platformConfig.findUnique({ where: { key: "default_commission_rate" } }),
    ]);

    return NextResponse.json({
      owners,
      defaultRate: globalConfig ? parseFloat(globalConfig.value) : 10,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /api/superadmin/commission error:", error);
    return NextResponse.json({ error: "Failed to fetch commission data" }, { status: 500 });
  }
}

// PATCH /api/superadmin/commission — update individual owner commission
export async function PATCH(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.response) return authResult.response;

  try {
    const { ownerId, commissionPercentage, reason } = await req.json();
    if (!ownerId || commissionPercentage == null) {
      return NextResponse.json({ error: "ownerId and commissionPercentage required" }, { status: 400 });
    }

    if (commissionPercentage < 0 || commissionPercentage > 100) {
      return NextResponse.json({ error: "Commission must be between 0 and 100" }, { status: 400 });
    }

    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { commissionPercentage: true, role: true, name: true },
    });

    if (!owner || owner.role !== "OWNER") {
      return NextResponse.json({ error: "Owner not found" }, { status: 404 });
    }

    const previousRate = owner.commissionPercentage ?? 10;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: ownerId },
        data: { commissionPercentage },
      }),
      prisma.commissionChangeLog.create({
        data: {
          ownerId,
          previousRate,
          newRate: commissionPercentage,
          changedBy: authResult.admin.id,
          reason: reason || "Manual update from commission management",
        },
      }),
      prisma.auditLog.create({
        data: {
          superadminId: authResult.admin.id,
          actionType: "UPDATE_COMMISSION",
          targetType: "USER",
          targetId: ownerId,
          targetName: owner.name,
          beforeValue: JSON.stringify({ commissionPercentage: previousRate }),
          afterValue: JSON.stringify({ commissionPercentage }),
          reason,
        },
      }),
    ]);

    return NextResponse.json({ success: true, previousRate, newRate: commissionPercentage });
  } catch (error) {
    console.error("PATCH /api/superadmin/commission error:", error);
    return NextResponse.json({ error: "Failed to update commission" }, { status: 500 });
  }
}

// POST /api/superadmin/commission — bulk update or set default rate
export async function POST(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.response) return authResult.response;

  try {
    const { action, defaultRate, ownerIds, commissionPercentage } = await req.json();

    if (action === "setDefault") {
      if (defaultRate == null || defaultRate < 0 || defaultRate > 100) {
        return NextResponse.json({ error: "Invalid default rate" }, { status: 400 });
      }
      await prisma.platformConfig.upsert({
        where: { key: "default_commission_rate" },
        create: { key: "default_commission_rate", value: String(defaultRate), description: "Default commission percentage for new owners" },
        update: { value: String(defaultRate) },
      });

      await prisma.auditLog.create({
        data: {
          superadminId: authResult.admin.id,
          actionType: "UPDATE_DEFAULT_COMMISSION",
          targetType: "PLATFORM_CONFIG",
          targetId: "default_commission_rate",
          afterValue: JSON.stringify({ defaultRate }),
        },
      });

      return NextResponse.json({ success: true, defaultRate });
    }

    if (action === "bulkUpdate") {
      if (!ownerIds?.length || commissionPercentage == null) {
        return NextResponse.json({ error: "ownerIds and commissionPercentage required" }, { status: 400 });
      }
      if (commissionPercentage < 0 || commissionPercentage > 100) {
        return NextResponse.json({ error: "Invalid commission rate" }, { status: 400 });
      }

      // Get current rates for logging
      const owners = await prisma.user.findMany({
        where: { id: { in: ownerIds }, role: "OWNER" },
        select: { id: true, name: true, commissionPercentage: true },
      });

      // Update all owners
      await prisma.user.updateMany({
        where: { id: { in: ownerIds }, role: "OWNER" },
        data: { commissionPercentage },
      });

      // Create change logs
      await prisma.commissionChangeLog.createMany({
        data: owners.map((o) => ({
          ownerId: o.id,
          previousRate: o.commissionPercentage ?? 10,
          newRate: commissionPercentage,
          changedBy: authResult.admin.id,
          reason: "Bulk commission update",
        })),
      });

      await prisma.auditLog.create({
        data: {
          superadminId: authResult.admin.id,
          actionType: "BULK_UPDATE_COMMISSION",
          targetType: "USER",
          targetId: ownerIds.join(","),
          afterValue: JSON.stringify({ commissionPercentage, count: owners.length }),
        },
      });

      return NextResponse.json({ success: true, updatedCount: owners.length });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/superadmin/commission error:", error);
    return NextResponse.json({ error: "Failed to process" }, { status: 500 });
  }
}
