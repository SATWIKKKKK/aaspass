import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/announcements/platform — get platform announcements for current user
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;
    const role = (session.user as any)?.role;

    // Find announcements targeted to this user
    const announcements = await prisma.superAdminAnnouncement.findMany({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
        AND: {
          OR: [
            { targetType: "ALL" },
            { targetType: role === "OWNER" ? "ALL_OWNERS" : "ALL_USERS" },
            { targetType: role === "OWNER" ? "SELECTED_OWNERS" : "SELECTED_USERS", targetIds: { has: userId } },
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Get read receipts for banner announcements
    const announcementIds = announcements.map((a) => a.id);
    const readReceipts = await prisma.announcementReadReceipt.findMany({
      where: { announcementId: { in: announcementIds }, userId },
    });

    const readMap = new Map(readReceipts.map((r) => [r.announcementId, r]));

    const enriched = announcements.map((a) => ({
      ...a,
      isRead: readMap.get(a.id)?.isRead ?? false,
      isDismissed: readMap.get(a.id)?.isDismissed ?? false,
    }));

    return NextResponse.json({ announcements: enriched });
  } catch (error) {
    console.error("GET /api/announcements/platform error:", error);
    return NextResponse.json({ error: "Failed to fetch announcements" }, { status: 500 });
  }
}

// PATCH /api/announcements/platform — mark as read/dismissed
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { announcementId, action } = await req.json(); // action: 'read' | 'dismiss'
    if (!announcementId || !action) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const data: any = {};
    if (action === "read") { data.isRead = true; data.readAt = new Date(); }
    if (action === "dismiss") { data.isDismissed = true; data.isRead = true; data.readAt = new Date(); }

    await prisma.announcementReadReceipt.upsert({
      where: { announcementId_userId: { announcementId, userId: session.user.id } },
      create: { announcementId, userId: session.user.id, ...data },
      update: data,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/announcements/platform error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
