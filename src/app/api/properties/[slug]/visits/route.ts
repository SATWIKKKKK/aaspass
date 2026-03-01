import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/properties/[slug]/visits — get visit analytics (owner only)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;

    const property = await prisma.property.findUnique({
      where: { slug },
      select: { id: true, ownerId: true, totalViews: true },
    });
    if (!property) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (property.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const now = new Date();

    // This week (Monday start)
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - mondayOffset);
    weekStart.setHours(0, 0, 0, 0);

    // This month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [thisWeek, thisMonth] = await Promise.all([
      prisma.propertyVisit.count({
        where: { propertyId: property.id, createdAt: { gte: weekStart } },
      }),
      prisma.propertyVisit.count({
        where: { propertyId: property.id, createdAt: { gte: monthStart } },
      }),
    ]);

    return NextResponse.json({
      totalViews: property.totalViews,
      thisWeek,
      thisMonth,
    });
  } catch (error) {
    console.error("GET /api/properties/[slug]/visits error:", error);
    return NextResponse.json({ error: "Failed to fetch visits" }, { status: 500 });
  }
}
