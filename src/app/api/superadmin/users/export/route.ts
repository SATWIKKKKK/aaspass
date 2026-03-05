import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.response) return authResult.response;

  try {
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const role = url.searchParams.get("role") || "";
    const plan = url.searchParams.get("plan") || "";
    const status = url.searchParams.get("status") || "";

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }
    if (role === "STUDENT" || role === "OWNER") where.role = role;
    if (plan === "premium") where.isPremium = true;
    else if (plan === "free") where.isPremium = false;
    if (status === "active") where.isBlocked = false;
    else if (status === "suspended") where.isBlocked = true;

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        name: true,
        email: true,
        phone: true,
        role: true,
        isPremium: true,
        isBlocked: true,
        superCoins: true,
        createdAt: true,
        updatedAt: true,
        premiumExpiry: true,
        _count: { select: { bookings: true, reviews: true } },
      },
    });

    const headers = ["Name", "Email", "Phone", "Role", "Plan", "Premium Expiry", "Status", "Super Coins", "Bookings", "Reviews", "Joined", "Last Active"];

    const escapeCSV = (val: string) => {
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const rows = users.map((u) => [
      escapeCSV(u.name),
      escapeCSV(u.email),
      u.phone || "",
      u.role,
      u.isPremium ? "Premium" : "Free",
      u.premiumExpiry ? new Date(u.premiumExpiry).toLocaleDateString("en-IN") : "",
      u.isBlocked ? "Suspended" : "Active",
      String(u.superCoins),
      String(u._count.bookings),
      String(u._count.reviews),
      new Date(u.createdAt).toLocaleDateString("en-IN"),
      new Date(u.updatedAt).toLocaleDateString("en-IN"),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="aaspass-users-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to export users" }, { status: 500 });
  }
}
