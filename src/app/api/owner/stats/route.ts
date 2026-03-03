import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/owner/stats — comprehensive owner dashboard stats
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerId = session.user.id!;

    // Fetch all data in parallel
    const [properties, bookings, complaints, announcementCount] = await Promise.all([
      prisma.property.findMany({
        where: { ownerId },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          avgRating: true,
          totalReviews: true,
          price: true,
          serviceType: true,
          city: true,
          capacity: true,
          availableRooms: true,
          _count: { select: { serviceStudents: true } },
        },
      }),
      prisma.booking.findMany({
        where: { property: { ownerId } },
        select: {
          id: true,
          status: true,
          grandTotal: true,
          createdAt: true,
          propertyId: true,
        },
      }),
      prisma.complaint.findMany({
        where: { property: { ownerId } },
        select: { id: true, status: true },
      }),
      prisma.announcement.count({ where: { ownerId } }),
    ]);

    // Compute aggregate stats
    const totalRevenue = bookings.reduce(
      (sum, b) => sum + (b.grandTotal || 0),
      0
    );
    const activeBookings = bookings.filter((b) =>
      ["ACTIVE", "CONFIRMED"].includes(b.status)
    ).length;
    const pendingBookings = bookings.filter(
      (b) => b.status === "PENDING"
    ).length;
    const completedBookings = bookings.filter(
      (b) => b.status === "COMPLETED"
    ).length;
    const cancelledBookings = bookings.filter(
      (b) => b.status === "CANCELLED"
    ).length;

    const avgRating =
      properties.length > 0
        ? properties.reduce((sum, p) => sum + p.avgRating, 0) /
          properties.length
        : 0;
    const totalReviews = properties.reduce(
      (sum, p) => sum + p.totalReviews,
      0
    );
    const openComplaints = complaints.filter(
      (c) => c.status === "OPEN"
    ).length;
    const verifiedProperties = properties.filter(
      (p) => p.status === "VERIFIED"
    ).length;

    // Monthly revenue for last 12 months
    const now = new Date();
    const monthlyRevenue = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(
        now.getFullYear(),
        now.getMonth() - i + 1,
        0,
        23,
        59,
        59
      );
      const monthBookings = bookings.filter((b) => {
        const d = new Date(b.createdAt);
        return d >= monthStart && d <= monthEnd;
      });
      monthlyRevenue.push({
        month: monthStart.toLocaleString("en", {
          month: "short",
          year: "2-digit",
        }),
        revenue: monthBookings.reduce((s, b) => s + (b.grandTotal || 0), 0),
        bookings: monthBookings.length,
      });
    }

    // Per-property breakdown
    const propertyStats = properties.map((p) => {
      const propBookings = bookings.filter((b) => b.propertyId === p.id);
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        status: p.status,
        serviceType: p.serviceType,
        city: p.city,
        avgRating: p.avgRating,
        totalReviews: p.totalReviews,
        price: p.price,
        capacity: p.capacity,
        availableRooms: p.availableRooms,
        studentCount: (p as any)._count?.serviceStudents ?? 0,
        totalBookings: propBookings.length,
        activeBookings: propBookings.filter((b) =>
          ["ACTIVE", "CONFIRMED"].includes(b.status)
        ).length,
        revenue: propBookings.reduce((s, b) => s + (b.grandTotal || 0), 0),
      };
    });

    // Total students and capacity across all properties
    const totalStudents = properties.reduce((s, p) => s + ((p as any)._count?.serviceStudents ?? 0), 0);
    const totalCapacity = properties.reduce((s, p) => s + (p.capacity ?? 0), 0);
    const totalAvailable = properties.reduce((s, p) => s + (p.availableRooms ?? 0), 0);

    return NextResponse.json({
      totalProperties: properties.length,
      verifiedProperties,
      totalBookings: bookings.length,
      activeBookings,
      pendingBookings,
      completedBookings,
      cancelledBookings,
      totalRevenue,
      avgRating: parseFloat(avgRating.toFixed(1)),
      totalReviews,
      totalComplaints: complaints.length,
      openComplaints,
      totalAnnouncements: announcementCount,
      totalStudents,
      totalCapacity,
      totalAvailable,
      monthlyRevenue,
      propertyStats,
    });
  } catch (error) {
    console.error("GET /api/owner/stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
