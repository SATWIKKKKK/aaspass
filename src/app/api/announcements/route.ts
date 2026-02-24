import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/announcements — list announcements for owner
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("propertyId");

    const where: Record<string, string | null> = { ownerId: session.user.id! };
    if (propertyId) where.propertyId = propertyId;

    const announcements = await prisma.announcement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { property: { select: { name: true, slug: true } } },
    });

    return NextResponse.json({ announcements });
  } catch (error) {
    console.error("GET /api/announcements error:", error);
    return NextResponse.json({ error: "Failed to fetch announcements" }, { status: 500 });
  }
}

// POST /api/announcements — create announcement + notify booked students
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as { role?: string })?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, content, propertyId } = await req.json();
    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    // Verify property belongs to this owner
    if (propertyId) {
      const property = await prisma.property.findFirst({
        where: { id: propertyId, ownerId: session.user.id! },
      });
      if (!property) {
        return NextResponse.json({ error: "Property not found or unauthorized" }, { status: 404 });
      }
    }

    // Create announcement
    const announcement = await prisma.announcement.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        ownerId: session.user.id!,
        propertyId: propertyId || null,
      },
    });

    // If property-specific, notify all students who have bookings for this property
    let notifiedCount = 0;
    if (propertyId) {
      const bookings = await prisma.booking.findMany({
        where: {
          propertyId,
          status: { in: ["ACTIVE", "CONFIRMED", "PENDING"] },
        },
        select: { studentId: true },
      });

      const uniqueStudentIds = [...new Set(bookings.map((b) => b.studentId))];

      // Create notifications for each student
      if (uniqueStudentIds.length > 0) {
        await prisma.notification.createMany({
          data: uniqueStudentIds.map((studentId) => ({
            userId: studentId,
            title: `📢 ${title.trim()}`,
            message: content.trim(),
            link: propertyId ? `/services/${propertyId}` : null,
          })),
        });
        notifiedCount = uniqueStudentIds.length;
      }
    }

    return NextResponse.json({ announcement, notifiedCount }, { status: 201 });
  } catch (error) {
    console.error("POST /api/announcements error:", error);
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });
  }
}
