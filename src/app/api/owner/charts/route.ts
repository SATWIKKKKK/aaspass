import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/owner/charts — Returns chart data for the owner dashboard
// Radar chart (6-month metrics), Line chart (daily events 90 days),
// Bar chart (monthly bookings per service), Pie chart (students by service),
// Area chart (cumulative unique visitors)
export async function GET() {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerId = session.user.id!;

    // Get owner properties
    const properties = await prisma.property.findMany({
      where: { ownerId },
      select: { id: true, name: true, serviceType: true },
    });
    const propertyIds = properties.map((p) => p.id);

    if (propertyIds.length === 0) {
      return NextResponse.json({
        radar: [],
        line: [],
        bar: [],
        pie: [],
        area: [],
      });
    }

    const now = new Date();

    // ─── RADAR CHART: 6-month performance (Views vs Wishlists) ───
    const radarData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = d.toISOString().slice(0, 7);
      const label = d.toLocaleString("en", { month: "short" });

      const [views, wishlists] = await Promise.all([
        prisma.engagementEvent.count({
          where: { propertyId: { in: propertyIds }, eventType: "CLICK", month: monthKey },
        }),
        prisma.engagementEvent.count({
          where: { propertyId: { in: propertyIds }, eventType: "WISHLIST_ADD", month: monthKey },
        }),
      ]);

      radarData.push({ month: label, views, wishlists });
    }

    // Radar trend: compare last month vs previous month
    const lastMonth = radarData[radarData.length - 1]?.views ?? 0;
    const prevMonth = radarData[radarData.length - 2]?.views ?? 0;
    const radarTrend = prevMonth > 0 ? Math.round(((lastMonth - prevMonth) / prevMonth) * 100 * 10) / 10 : 0;

    // ─── LINE CHART: Daily events for last 90 days (Views vs Cart Adds) ───
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const dailyEvents = await prisma.engagementEvent.findMany({
      where: {
        propertyId: { in: propertyIds },
        createdAt: { gte: ninetyDaysAgo },
      },
      select: { eventType: true, createdAt: true },
    });

    // Group by date
    const dailyMap = new Map<string, { views: number; cartAdds: number }>();
    for (let i = 89; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      dailyMap.set(key, { views: 0, cartAdds: 0 });
    }
    for (const ev of dailyEvents) {
      const key = ev.createdAt.toISOString().slice(0, 10);
      const entry = dailyMap.get(key);
      if (entry) {
        if (ev.eventType === "CLICK") entry.views++;
        if (ev.eventType === "CART_ADD") entry.cartAdds++;
      }
    }
    const lineData = Array.from(dailyMap.entries()).map(([date, vals]) => ({
      date,
      views: vals.views,
      cartAdds: vals.cartAdds,
    }));

    // ─── BAR CHART: Monthly bookings per service (last 6 months) ───
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const bookings = await prisma.booking.findMany({
      where: {
        propertyId: { in: propertyIds },
        createdAt: { gte: sixMonthsAgo },
        status: { in: ["CONFIRMED", "ACTIVE", "COMPLETED"] },
      },
      select: { propertyId: true, createdAt: true },
    });

    const barMap = new Map<string, Record<string, number>>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = d.toLocaleString("en", { month: "short" });
      const entry: Record<string, number> = { month: 0 }; // placeholder
      for (const p of properties) {
        entry[p.name] = 0;
      }
      barMap.set(monthKey, entry);
    }
    for (const b of bookings) {
      const d = new Date(b.createdAt);
      const monthKey = d.toLocaleString("en", { month: "short" });
      const prop = properties.find((p) => p.id === b.propertyId);
      const entry = barMap.get(monthKey);
      if (entry && prop) {
        entry[prop.name] = (entry[prop.name] || 0) + 1;
      }
    }
    const barData = Array.from(barMap.entries()).map(([month, vals]) => ({
      month,
      ...vals,
    }));

    // ─── PIE CHART: Students by service ───
    const studentCounts = await prisma.serviceStudent.groupBy({
      by: ["propertyId"],
      where: { propertyId: { in: propertyIds }, status: "ACTIVE" },
      _count: true,
    });
    const pieData = studentCounts.map((sc) => {
      const prop = properties.find((p) => p.id === sc.propertyId);
      return {
        name: prop?.name || "Unknown",
        value: sc._count,
        serviceType: prop?.serviceType || "OTHER",
      };
    }).filter((d) => d.value > 0);

    // ─── AREA CHART: Cumulative unique visitors by month (12 months) ───
    const areaData = [];
    let cumulative = 0;
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = d.toISOString().slice(0, 7);
      const label = d.toLocaleString("en", { month: "short", year: "2-digit" });

      const monthVisitors = await prisma.engagementEvent.findMany({
        where: {
          propertyId: { in: propertyIds },
          eventType: "CLICK",
          month: monthKey,
        },
        select: { userId: true, ipAddress: true },
        distinct: ["userId", "ipAddress"],
      });

      cumulative += monthVisitors.length;
      areaData.push({ month: label, uniqueVisitors: cumulative, newVisitors: monthVisitors.length });
    }

    return NextResponse.json({
      radar: { data: radarData, trend: radarTrend },
      line: lineData,
      bar: { data: barData, services: properties.map((p) => p.name) },
      pie: pieData,
      area: areaData,
    });
  } catch (error) {
    console.error("GET /api/owner/charts error:", error);
    return NextResponse.json({ error: "Failed to load chart data" }, { status: 500 });
  }
}
