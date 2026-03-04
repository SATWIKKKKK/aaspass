import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.response) return authResult.response;

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
    const search = url.searchParams.get("search") || "";
    const serviceType = url.searchParams.get("serviceType") || "";
    const status = url.searchParams.get("status") || "";
    const city = url.searchParams.get("city") || "";
    const sortBy = url.searchParams.get("sortBy") || "createdAt";
    const sortOrder = url.searchParams.get("sortOrder") || "desc";

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { owner: { name: { contains: search, mode: "insensitive" } } },
        { city: { contains: search, mode: "insensitive" } },
      ];
    }
    if (serviceType) where.serviceType = serviceType;
    if (status) where.status = status;
    if (city) where.city = { contains: city, mode: "insensitive" };

    const orderBy: any = {};
    if (sortBy === "totalViews") orderBy.totalViews = sortOrder;
    else if (sortBy === "totalReviews") orderBy.totalReviews = sortOrder;
    else if (sortBy === "avgRating") orderBy.avgRating = sortOrder;
    else if (sortBy === "price") orderBy.price = sortOrder;
    else orderBy.createdAt = sortOrder;

    const [services, total] = await Promise.all([
      prisma.property.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, name: true, slug: true, serviceType: true, city: true,
          status: true, totalViews: true, totalReviews: true, avgRating: true,
          price: true, capacity: true, availableRooms: true, createdAt: true,
          owner: { select: { id: true, name: true, email: true } },
          _count: { select: { bookings: true } },
          images: { take: 1, select: { url: true } },
        },
      }),
      prisma.property.count({ where }),
    ]);

    return NextResponse.json({
      services,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Services list error:", error);
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
  }
}
