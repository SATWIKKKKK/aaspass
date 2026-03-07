import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { prisma } from "@/lib/prisma";

// GET /api/superadmin/commission/history?ownerId=xxx
export async function GET(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.response) return authResult.response;

  try {
    const url = new URL(req.url);
    const ownerId = url.searchParams.get("ownerId");
    if (!ownerId) return NextResponse.json({ error: "ownerId required" }, { status: 400 });

    const logs = await prisma.commissionChangeLog.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("GET /api/superadmin/commission/history error:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
