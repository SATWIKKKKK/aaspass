import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/owner/commission — get owner's commission info
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [user, defaultConfig] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { commissionPercentage: true },
      }),
      prisma.platformConfig.findUnique({ where: { key: "default_commission_rate" } }),
    ]);

    const rate = user?.commissionPercentage ?? (defaultConfig ? parseFloat(defaultConfig.value) : 10);

    return NextResponse.json({
      commissionPercentage: rate,
      example: {
        bookingAmount: 10000,
        commission: Math.round(10000 * rate / 100),
        ownerReceives: Math.round(10000 * (100 - rate) / 100),
      },
    });
  } catch (error) {
    console.error("GET /api/owner/commission error:", error);
    return NextResponse.json({ error: "Failed to fetch commission info" }, { status: 500 });
  }
}
