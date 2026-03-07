import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/properties — list properties with filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const owner = searchParams.get("owner");
    const serviceType = searchParams.get("serviceType");
    const city = searchParams.get("city");
    const q = searchParams.get("q"); // full-text search
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const forGender = searchParams.get("forGender");
    const isAC = searchParams.get("isAC");
    const hasWifi = searchParams.get("hasWifi");
    const foodIncluded = searchParams.get("foodIncluded");
    const laundryIncluded = searchParams.get("laundryIncluded");
    const sort = searchParams.get("sort") || "avgRating";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");

    const where: any = {};
    if (owner === "me") {
      const session = await auth();
      if (!session || (session.user as any)?.role !== "OWNER") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      where.ownerId = session.user.id!;
      // Owner sees all their properties regardless of status
    } else {
      where.status = "VERIFIED"; // Public API only shows verified
    }
    // Support comma-separated service types (e.g. "HOSTEL,PG" for Accommodation)
    if (serviceType) {
      const types = serviceType.split(",").map((t: string) => t.trim()).filter(Boolean);
      if (types.length === 1) {
        where.serviceType = types[0];
      } else if (types.length > 1) {
        where.serviceType = { in: types };
      }
    }
    if (city) where.city = { contains: city, mode: "insensitive" };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        { address: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { nearbyLandmark: { contains: q, mode: "insensitive" } },
      ];
    }
    if (minPrice) where.price = { ...where.price, gte: parseFloat(minPrice) };
    if (maxPrice) where.price = { ...where.price, lte: parseFloat(maxPrice) };
    if (forGender) where.forGender = forGender;
    if (isAC === "true") where.isAC = true;
    if (hasWifi === "true") where.hasWifi = true;
    if (foodIncluded === "true") where.foodIncluded = true;
    if (laundryIncluded === "true") where.laundryIncluded = true;

    let orderBy: any = { avgRating: "desc" };
    if (sort === "price_asc") orderBy = { price: "asc" };
    if (sort === "price_desc") orderBy = { price: "desc" };
    if (sort === "reviews") orderBy = { totalReviews: "desc" };
    if (sort === "most_viewed") orderBy = { totalViews: "desc" };

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          images: { take: 4, orderBy: { order: "asc" } },
          owner: { select: { name: true } },
          _count: { select: { bookings: true, serviceStudents: true, wishlistItems: true } },
        },
      }),
      prisma.property.count({ where }),
    ]);

    return NextResponse.json({
      properties,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /api/properties error:", error);
    return NextResponse.json({ error: "Failed to fetch properties" }, { status: 500 });
  }
}

// POST /api/properties — create property (owner only)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name, serviceType, description, price, gstRate, address, city, state, pincode,
      latitude, longitude, nearbyLandmark, distanceMarket, distanceInstitute,
      isAC, hasWifi, forGender, occupancy, foodIncluded, laundryIncluded,
      hasMedical, nearbyMess, nearbyLaundry, cancellationPolicy, rules, images,
      capacity, availableRooms, closingTime, pricingPlans, customAmenities,
      saveAsDraft,
    } = body;

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const propertyStatus = saveAsDraft ? "DRAFT" : "VERIFIED";

    const property = await prisma.property.create({
      data: {
        name, slug, serviceType, description, price: parseFloat(price),
        gstRate: parseFloat(gstRate || "18"),
        address, city, state, pincode,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        nearbyLandmark, distanceMarket, distanceInstitute,
        isAC: Boolean(isAC), hasWifi: Boolean(hasWifi),
        forGender: forGender || null, occupancy: occupancy ? parseInt(occupancy) : null,
        foodIncluded: Boolean(foodIncluded), laundryIncluded: Boolean(laundryIncluded),

        hasMedical: Boolean(hasMedical), nearbyMess, nearbyLaundry,
        cancellationPolicy, rules,
        customAmenities: Array.isArray(customAmenities) ? customAmenities : [],
        capacity: capacity ? parseInt(capacity) : null,
        availableRooms: availableRooms ? parseInt(availableRooms) : null,
        closingTime: closingTime || null,
        status: propertyStatus,
        ownerId: session.user.id!,
        images: images?.length
          ? { create: images.map((img: any) => ({ url: img.url, isWideShot: img.isWideShot || false })) }
          : undefined,
        pricingPlans: pricingPlans?.length
          ? {
              create: pricingPlans.map((plan: any) => ({
                label: plan.label,
                durationDays: parseInt(plan.durationDays),
                price: parseFloat(plan.price),
                isActive: plan.isActive !== false,
              })),
            }
          : undefined,
      },
      include: { pricingPlans: true },
    });

    // If publishing (not draft), create a publishing fee record
    if (!saveAsDraft) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id! },
        select: { createdAt: true },
      });

      const FREE_QUOTA_DAYS = 90;
      const createdAt = user!.createdAt;
      const expiryDate = new Date(createdAt.getTime() + FREE_QUOTA_DAYS * 24 * 60 * 60 * 1000);
      const isFreePublish = new Date() < expiryDate;

      await prisma.servicePublishingFee.create({
        data: {
          propertyId: property.id,
          ownerId: session.user.id!,
          serviceType,
          amount: isFreePublish ? 0 : 0, // Amount set on actual payment
          isFreePublish,
          paidAt: isFreePublish ? new Date() : null,
          expiresAt: isFreePublish ? expiryDate : null,
          status: isFreePublish ? "active" : "active",
        },
      });
    }

    return NextResponse.json({ property, isDraft: saveAsDraft || false }, { status: 201 });
  } catch (error) {
    console.error("POST /api/properties error:", error);
    return NextResponse.json({ error: "Failed to create property" }, { status: 500 });
  }
}
