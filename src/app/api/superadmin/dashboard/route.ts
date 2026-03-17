import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const authResult = await requireSuperAdmin();
  if (authResult.response) return authResult.response;

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      totalOwners,
      totalServices,
      totalBookings,
      revenueResult,
      signupsToday,
      signupsWeek,
      signupsMonth,
      activePremium,
      totalWarnings,
      totalSuspensions,
      recentUsers,
      recentBookings,
      recentReviews,
      recentServices,
      pendingProperties,
      failedPayments24h,
      fullyBookedServices,
      activeAnnouncements,
      commissionResult,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "OWNER" } }),
      prisma.property.count(),
      prisma.booking.count(),
      prisma.booking.aggregate({
        _sum: { grandTotal: true },
        where: { paymentStatus: "paid" },
      }),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.user.count({ where: { isPremium: true } }),
      prisma.userWarning.count(),
      prisma.userSuspension.count({ where: { isActive: true } }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
      prisma.booking.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true, bookingNo: true, status: true, grandTotal: true, createdAt: true,
          student: { select: { name: true } },
          property: { select: { name: true } },
        },
      }),
      prisma.review.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true, rating: true, comment: true, createdAt: true,
          user: { select: { name: true } },
          property: { select: { name: true } },
        },
      }),
      prisma.property.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, serviceType: true, city: true, createdAt: true, owner: { select: { name: true } } },
      }),
      prisma.property.count({ where: { status: "PENDING" } }),
      prisma.booking.count({
        where: { paymentStatus: "failed", createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
      }),
      prisma.property.count({
        where: { availableRooms: { lte: 0 }, status: "VERIFIED" },
      }),
      prisma.superAdminAnnouncement.count({ where: { isActive: true } }),
      prisma.ownerPayout.aggregate({
        _sum: { commissionAmount: true },
        where: { payoutStatus: "processed" },
      }),
    ]);

    const response = NextResponse.json({
      metrics: {
        totalUsers,
        totalOwners,
        totalStudents: totalUsers - totalOwners,
        totalServices,
        totalBookings,
        totalRevenue: revenueResult._sum.grandTotal || 0,
        signupsToday,
        signupsWeek,
        signupsMonth,
        activePremium,
        totalViolations: totalWarnings + totalSuspensions,
        activeAnnouncements,
        totalCommission: commissionResult._sum.commissionAmount || 0,
      },
      health: {
        pendingProperties,
        failedPayments24h,
        fullyBookedServices,
      },
      recentActivity: {
        users: recentUsers,
        bookings: recentBookings,
        reviews: recentReviews,
        services: recentServices,
      },
    });

    // Cache for 30s, serve stale for 60s while revalidating
    response.headers.set(
      "Cache-Control",
      "private, s-maxage=30, stale-while-revalidate=60"
    );

    return response;
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
