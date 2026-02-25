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

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          images: { take: 4, orderBy: { order: "asc" } },
          owner: { select: { name: true } },
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
      foodRating, hasMedical, nearbyMess, nearbyLaundry, cancellationPolicy, rules, images,
    } = body;

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

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
        foodRating: foodRating ? parseFloat(foodRating) : null,
        hasMedical: Boolean(hasMedical), nearbyMess, nearbyLaundry,
        cancellationPolicy, rules,
        status: "VERIFIED",
        ownerId: session.user.id!,
        images: images?.length
          ? { create: images.map((img: any) => ({ url: img.url, isWideShot: img.isWideShot || false })) }
          : undefined,
      },
    });

    return NextResponse.json({ property }, { status: 201 });
  } catch (error) {
    console.error("POST /api/properties error:", error);
    return NextResponse.json({ error: "Failed to create property" }, { status: 500 });
  }
}
