import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/properties/[slug]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const property = await prisma.property.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { order: "asc" } },
        owner: { select: { id: true, name: true, phone: true, image: true } },
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { user: { select: { name: true, image: true } } },
        },
        _count: { select: { bookings: true } },
      },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    return NextResponse.json({ property });
  } catch (error) {
    console.error("GET /api/properties/[slug] error:", error);
    return NextResponse.json({ error: "Failed to fetch property" }, { status: 500 });
  }
}

// PUT /api/properties/[slug] — update property (owner only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;

    // Verify ownership
    const existing = await prisma.property.findFirst({
      where: { slug, ownerId: session.user.id! },
    });
    if (!existing) {
      return NextResponse.json({ error: "Property not found or unauthorized" }, { status: 404 });
    }

    const body = await req.json();
    const {
      name, description, price, gstRate, address, city, state, pincode,
      latitude, longitude, nearbyLandmark, distanceMarket, distanceInstitute,
      isAC, hasWifi, forGender, occupancy, foodIncluded, laundryIncluded,
      foodRating, hasMedical, nearbyMess, nearbyLaundry, cancellationPolicy, rules, images,
    } = body;

    // Build update data — only include fields that are provided
    const data: any = {};
    if (name !== undefined) {
      data.name = name;
      data.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    }
    if (description !== undefined) data.description = description;
    if (price !== undefined) data.price = parseFloat(price);
    if (gstRate !== undefined) data.gstRate = parseFloat(gstRate);
    if (address !== undefined) data.address = address;
    if (city !== undefined) data.city = city;
    if (state !== undefined) data.state = state;
    if (pincode !== undefined) data.pincode = pincode;
    if (latitude !== undefined) data.latitude = latitude ? parseFloat(latitude) : null;
    if (longitude !== undefined) data.longitude = longitude ? parseFloat(longitude) : null;
    if (nearbyLandmark !== undefined) data.nearbyLandmark = nearbyLandmark || null;
    if (distanceMarket !== undefined) data.distanceMarket = distanceMarket || null;
    if (distanceInstitute !== undefined) data.distanceInstitute = distanceInstitute || null;
    if (isAC !== undefined) data.isAC = Boolean(isAC);
    if (hasWifi !== undefined) data.hasWifi = Boolean(hasWifi);
    if (forGender !== undefined) data.forGender = forGender || null;
    if (occupancy !== undefined) data.occupancy = occupancy ? parseInt(occupancy) : null;
    if (foodIncluded !== undefined) data.foodIncluded = Boolean(foodIncluded);
    if (laundryIncluded !== undefined) data.laundryIncluded = Boolean(laundryIncluded);
    if (foodRating !== undefined) data.foodRating = foodRating ? parseFloat(foodRating) : null;
    if (hasMedical !== undefined) data.hasMedical = Boolean(hasMedical);
    if (nearbyMess !== undefined) data.nearbyMess = nearbyMess || null;
    if (nearbyLaundry !== undefined) data.nearbyLaundry = nearbyLaundry || null;
    if (cancellationPolicy !== undefined) data.cancellationPolicy = cancellationPolicy || null;
    if (rules !== undefined) data.rules = rules || null;

    // Handle image updates: if images array provided, replace all images
    if (images !== undefined) {
      // Delete existing images
      await prisma.propertyImage.deleteMany({ where: { propertyId: existing.id } });
      // Create new images
      if (images.length > 0) {
        data.images = {
          create: images.map((img: any, idx: number) => ({
            url: img.url,
            isWideShot: img.isWideShot || false,
            order: idx,
          })),
        };
      }
    }

    const property = await prisma.property.update({
      where: { id: existing.id },
      data,
      include: {
        images: { orderBy: { order: "asc" } },
      },
    });

    return NextResponse.json({ property });
  } catch (error) {
    console.error("PUT /api/properties/[slug] error:", error);
    return NextResponse.json({ error: "Failed to update property" }, { status: 500 });
  }
}

// DELETE /api/properties/[slug] — delete property (owner only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const property = await prisma.property.findFirst({
      where: { slug, ownerId: session.user.id! },
    });
    if (!property) {
      return NextResponse.json({ error: "Property not found or unauthorized" }, { status: 404 });
    }

    await prisma.property.delete({ where: { id: property.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/properties/[slug] error:", error);
    return NextResponse.json({ error: "Failed to delete property" }, { status: 500 });
  }
}
