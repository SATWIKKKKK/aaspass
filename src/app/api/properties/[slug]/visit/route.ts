import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/properties/[slug]/visit — record a visit
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Find property
    const property = await prisma.property.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!property) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const session = await auth();
    const userId = session?.user?.id || null;

    // Get IP address from headers
    const forwarded = req.headers.get("x-forwarded-for");
    const ipAddress = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "unknown";

    // Get or create a session token for guests
    const body = await req.json().catch(() => ({}));
    const sessionToken = body.sessionToken || null;
    const userAgent = req.headers.get("user-agent") || null;

    // Always log append-only CLICK engagement event (no dedup — every click counts)
    const month = new Date().toISOString().slice(0, 7); // "2025-01"
    await prisma.engagementEvent.create({
      data: {
        propertyId: property.id,
        eventType: "CLICK",
        userId,
        guestToken: sessionToken,
        ipAddress,
        month,
      },
    });

    // Deduplication: For logged-in users, limit to 1 visit per user per property per hour
    // For guests, limit by IP + sessionToken per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    if (userId) {
      const recentVisit = await prisma.propertyVisit.findFirst({
        where: {
          propertyId: property.id,
          userId,
          createdAt: { gte: oneHourAgo },
        },
      });
      if (recentVisit) {
        return NextResponse.json({ counted: false, message: "Already counted" });
      }
    } else if (ipAddress && sessionToken) {
      const recentVisit = await prisma.propertyVisit.findFirst({
        where: {
          propertyId: property.id,
          ipAddress,
          sessionToken,
          createdAt: { gte: oneHourAgo },
        },
      });
      if (recentVisit) {
        return NextResponse.json({ counted: false, message: "Already counted" });
      }
    }

    // Record visit (deduplicated — for unique visitor analytics)
    await prisma.propertyVisit.create({
      data: {
        propertyId: property.id,
        userId,
        ipAddress,
        sessionToken,
        userAgent,
      },
    });

    // Increment cached totalViews
    await prisma.property.update({
      where: { id: property.id },
      data: { totalViews: { increment: 1 } },
    });

    return NextResponse.json({ counted: true });
  } catch (error) {
    console.error("POST /api/properties/[slug]/visit error:", error);
    return NextResponse.json({ error: "Failed to record visit" }, { status: 500 });
  }
}
