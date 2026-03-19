import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/notifications
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user as { role?: string } | undefined)?.role;

    const rawNotifications = await prisma.notification.findMany({
      where: { userId: session.user.id! },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const notifications = rawNotifications.filter((n) => {
      const title = (n.title || "").toLowerCase();
      const message = (n.message || "").toLowerCase();
      const type = (n.type || "").toLowerCase();

      const isOwnerPremiumNotice =
        type.includes("owner_premium") ||
        title.includes("owner premium") ||
        message.includes("owner premium");

      const isStudentPremiumNotice =
        type.includes("student_premium") ||
        (type.includes("premium") && !isOwnerPremiumNotice) ||
        title.includes("premium") && !title.includes("owner premium") ||
        message.includes("premium") && !message.includes("owner premium");

      if (role === "OWNER") return !isStudentPremiumNotice || isOwnerPremiumNotice;
      if (role === "STUDENT") return !isOwnerPremiumNotice;
      return true;
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

// PATCH /api/notifications — mark as read
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { ids } = await req.json();

    if (ids && ids.length) {
      await prisma.notification.updateMany({
        where: { id: { in: ids }, userId: session.user.id! },
        data: { isRead: true },
      });
    } else {
      await prisma.notification.updateMany({
        where: { userId: session.user.id!, isRead: false },
        data: { isRead: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/notifications error:", error);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}

// POST /api/notifications — create notification (for announcements)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { userId, title, message, link } = await req.json();
    if (!userId || !title || !message) {
      return NextResponse.json({ error: "userId, title, and message are required" }, { status: 400 });
    }

    const notification = await prisma.notification.create({
      data: { userId, title, message, link: link || null },
    });

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    console.error("POST /api/notifications error:", error);
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }
}
