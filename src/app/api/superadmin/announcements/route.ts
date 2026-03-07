import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { announcementEmail } from "@/lib/email";

// GET /api/superadmin/announcements — list all announcements
export async function GET(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.response) return authResult.response;

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
    const status = url.searchParams.get("status"); // active | expired | all

    const where: any = {};
    if (status === "active") {
      where.isActive = true;
      where.OR = [{ expiresAt: null }, { expiresAt: { gt: new Date() } }];
    } else if (status === "expired") {
      where.OR = [{ isActive: false }, { expiresAt: { lt: new Date() } }];
    }

    const [announcements, total] = await Promise.all([
      prisma.superAdminAnnouncement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.superAdminAnnouncement.count({ where }),
    ]);

    return NextResponse.json({
      announcements,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /api/superadmin/announcements error:", error);
    return NextResponse.json({ error: "Failed to fetch announcements" }, { status: 500 });
  }
}

// POST /api/superadmin/announcements — create & send announcement
export async function POST(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.response) return authResult.response;

  try {
    const body = await req.json();
    const { title, message, type, targetType, targetIds, deliveryChannels, expiresAt, commissionValue } = body;

    if (!title?.trim() || !message?.trim() || !type || !targetType) {
      return NextResponse.json({ error: "Title, message, type, and targetType are required" }, { status: 400 });
    }

    // Build target user query
    let targetUserIds: string[] = [];
    if (targetType === "ALL_USERS") {
      const users = await prisma.user.findMany({ where: { role: "STUDENT", isBlocked: false }, select: { id: true } });
      targetUserIds = users.map((u) => u.id);
    } else if (targetType === "ALL_OWNERS") {
      const owners = await prisma.user.findMany({ where: { role: "OWNER", isBlocked: false }, select: { id: true } });
      targetUserIds = owners.map((u) => u.id);
    } else if (targetType === "SELECTED_USERS" || targetType === "SELECTED_OWNERS") {
      targetUserIds = targetIds || [];
    } else if (targetType === "ALL") {
      const all = await prisma.user.findMany({ where: { isBlocked: false }, select: { id: true } });
      targetUserIds = all.map((u) => u.id);
    }

    const channels: string[] = deliveryChannels || ["notification"];

    // Create the announcement
    const announcement = await prisma.superAdminAnnouncement.create({
      data: {
        title: title.trim(),
        message: message.trim(),
        type,
        targetType,
        targetIds: targetIds || [],
        createdById: authResult.admin.id,
        deliveryChannels: channels,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        reachCount: targetUserIds.length,
        commissionValue: type === "COMMISSION" ? commissionValue : null,
      },
    });

    // Handle COMMISSION type — update owner's commission
    if (type === "COMMISSION" && commissionValue != null && (targetType === "SELECTED_OWNERS" || targetType === "ALL_OWNERS")) {
      for (const ownerId of targetUserIds) {
        const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { commissionPercentage: true } });
        const previousRate = owner?.commissionPercentage ?? 10;

        await prisma.user.update({
          where: { id: ownerId },
          data: { commissionPercentage: commissionValue },
        });

        await prisma.commissionChangeLog.create({
          data: {
            ownerId,
            previousRate,
            newRate: commissionValue,
            changedBy: authResult.admin.id,
            reason: `Commission update via announcement: ${title}`,
          },
        });
      }
    }

    // Send notifications in-app
    if (channels.includes("notification") && targetUserIds.length > 0) {
      await prisma.notification.createMany({
        data: targetUserIds.map((userId) => ({
          userId,
          title: `📢 ${title.trim()}`,
          message: message.trim(),
          type: "announcement",
        })),
      });
    }

    // Create read receipts for banner tracking
    if (channels.includes("banner") && targetUserIds.length > 0) {
      await prisma.announcementReadReceipt.createMany({
        data: targetUserIds.map((userId) => ({
          announcementId: announcement.id,
          userId,
        })),
        skipDuplicates: true,
      });
    }

    // Send emails async (don't block response)
    if (channels.includes("email") && targetUserIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: targetUserIds } },
        select: { name: true, email: true },
      });

      // Fire and forget — log errors but don't fail the request
      Promise.allSettled(
        users.map((u) => {
          const emailContent = announcementEmail(u.name, title.trim(), message.trim(), type);
          return sendEmail({ to: u.email, ...emailContent });
        })
      ).catch(console.error);
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        superadminId: authResult.admin.id,
        actionType: "CREATE_ANNOUNCEMENT",
        targetType: "ANNOUNCEMENT",
        targetId: announcement.id,
        targetName: title.trim(),
        afterValue: JSON.stringify({ type, targetType, reachCount: targetUserIds.length }),
      },
    });

    return NextResponse.json({ announcement, reachCount: targetUserIds.length }, { status: 201 });
  } catch (error) {
    console.error("POST /api/superadmin/announcements error:", error);
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });
  }
}

// PATCH /api/superadmin/announcements — update/deactivate announcement
export async function PATCH(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.response) return authResult.response;

  try {
    const { id, isActive, title, message } = await req.json();
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const data: any = {};
    if (isActive !== undefined) data.isActive = isActive;
    if (title) data.title = title.trim();
    if (message) data.message = message.trim();

    const updated = await prisma.superAdminAnnouncement.update({
      where: { id },
      data,
    });

    return NextResponse.json({ announcement: updated });
  } catch (error) {
    console.error("PATCH /api/superadmin/announcements error:", error);
    return NextResponse.json({ error: "Failed to update announcement" }, { status: 500 });
  }
}
