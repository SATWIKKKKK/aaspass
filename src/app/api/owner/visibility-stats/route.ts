import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/owner/visibility-stats
// Returns append-only engagement counts for all services owned by the authenticated owner.
// All metrics are cumulative — they never decrease.
export async function GET() {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerId = session.user.id!;

    // Get all property IDs for this owner
    const properties = await prisma.property.findMany({
      where: { ownerId },
      select: { id: true },
    });
    const propertyIds = properties.map((p) => p.id);

    if (propertyIds.length === 0) {
      return NextResponse.json({ allTime: emptyTotals(), monthly: [] });
    }

    // Fetch all engagement events for owner's properties
    const events = await prisma.engagementEvent.findMany({
      where: { propertyId: { in: propertyIds } },
      select: { eventType: true, userId: true, guestToken: true, ipAddress: true, month: true },
    });

    // ── All-time totals ──────────────────────────────────────────────
    const totalClicks = events.filter((e) => e.eventType === "CLICK").length;
    const totalWishlistAdds = events.filter((e) => e.eventType === "WISHLIST_ADD").length;
    const totalCartAdds = events.filter((e) => e.eventType === "CART_ADD").length;

    // Unique visitors: CLICK events with distinct identity token
    const clickEvents = events.filter((e) => e.eventType === "CLICK");
    const uniqueIdSet = new Set(clickEvents.map((e) => e.userId ?? e.guestToken ?? e.ipAddress ?? "anon"));
    const uniqueVisitors = uniqueIdSet.size;

    // ── Last 12 months breakdown ─────────────────────────────────────
    const now = new Date();
    const monthly = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = d.toISOString().slice(0, 7); // "2025-01"
      const label = d.toLocaleString("en", { month: "short", year: "2-digit" }); // "Jan '25"

      const monthEvents = events.filter((e) => e.month === monthKey);
      const mClicks = monthEvents.filter((e) => e.eventType === "CLICK").length;
      const mWishlists = monthEvents.filter((e) => e.eventType === "WISHLIST_ADD").length;
      const mCartAdds = monthEvents.filter((e) => e.eventType === "CART_ADD").length;

      const mClickEvents = monthEvents.filter((e) => e.eventType === "CLICK");
      const mUniqueSet = new Set(mClickEvents.map((e) => e.userId ?? e.guestToken ?? e.ipAddress ?? "anon"));

      monthly.push({
        month: monthKey,
        label,
        clicks: mClicks,
        uniqueVisitors: mUniqueSet.size,
        wishlistAdds: mWishlists,
        cartAdds: mCartAdds,
      });
    }

    return NextResponse.json({
      allTime: {
        totalClicks,
        uniqueVisitors,
        wishlistAdds: totalWishlistAdds,
        cartAdds: totalCartAdds,
      },
      monthly,
    });
  } catch (error) {
    console.error("GET /api/owner/visibility-stats error:", error);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}

function emptyTotals() {
  return { totalClicks: 0, uniqueVisitors: 0, wishlistAdds: 0, cartAdds: 0 };
}
