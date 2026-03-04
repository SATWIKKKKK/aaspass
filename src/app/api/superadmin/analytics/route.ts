import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.response) return authResult.response;

  try {
    const url = new URL(req.url);
    const range = url.searchParams.get("range") || "30"; // days

    const days = parseInt(range);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Gather all analytics data in parallel
    const [
      usersByDay,
      bookingsByDay,
      revenueByDay,
      topServices,
      topCities,
      serviceTypeBreakdown,
      premiumRate,
      totalStats,
    ] = await Promise.all([
      // New signups per day
      prisma.$queryRawUnsafe(`
        SELECT DATE("createdAt") as date, COUNT(*)::int as count
        FROM users
        WHERE "createdAt" >= $1
        GROUP BY DATE("createdAt")
        ORDER BY date
      `, startDate),

      // Bookings per day
      prisma.$queryRawUnsafe(`
        SELECT DATE("createdAt") as date, COUNT(*)::int as count
        FROM bookings
        WHERE "createdAt" >= $1
        GROUP BY DATE("createdAt")
        ORDER BY date
      `, startDate),

      // Revenue per day
      prisma.$queryRawUnsafe(`
        SELECT DATE("createdAt") as date, COALESCE(SUM("grandTotal"), 0)::float as total
        FROM bookings
        WHERE "createdAt" >= $1 AND "paymentStatus" = 'paid'
        GROUP BY DATE("createdAt")
        ORDER BY date
      `, startDate),

      // Top services by bookings
      prisma.property.findMany({
        orderBy: { bookings: { _count: "desc" } },
        take: 10,
        select: {
          id: true, name: true, serviceType: true, city: true,
          totalViews: true, avgRating: true,
          _count: { select: { bookings: true, wishlistItems: true } },
        },
      }),

      // Top cities
      prisma.$queryRawUnsafe(`
        SELECT city, COUNT(*)::int as count
        FROM properties
        GROUP BY city
        ORDER BY count DESC
        LIMIT 10
      `),

      // Service type breakdown
      prisma.$queryRawUnsafe(`
        SELECT "serviceType", COUNT(*)::int as count
        FROM properties
        GROUP BY "serviceType"
        ORDER BY count DESC
      `),

      // Premium conversion
      Promise.all([
        prisma.user.count({ where: { role: "STUDENT" } }),
        prisma.user.count({ where: { role: "STUDENT", isPremium: true } }),
      ]),

      // Overall totals
      Promise.all([
        prisma.user.count(),
        prisma.property.count(),
        prisma.booking.count(),
        prisma.booking.aggregate({ _sum: { grandTotal: true }, where: { paymentStatus: "paid" } }),
      ]),
    ]);

    return NextResponse.json({
      charts: {
        usersByDay,
        bookingsByDay,
        revenueByDay,
      },
      rankings: {
        topServices,
        topCities,
        serviceTypeBreakdown,
      },
      premiumConversion: {
        totalStudents: premiumRate[0],
        premiumStudents: premiumRate[1],
        rate: premiumRate[0] > 0 ? (premiumRate[1] / premiumRate[0] * 100).toFixed(1) : 0,
      },
      totals: {
        users: totalStats[0],
        services: totalStats[1],
        bookings: totalStats[2],
        revenue: totalStats[3]._sum.grandTotal || 0,
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
