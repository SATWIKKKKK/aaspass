import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Haversine distance in meters
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// GET /api/properties/nearby?lat=...&lng=...&radius=2000&serviceType=HOSTEL,PG
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get("lat") || "");
    const lng = parseFloat(searchParams.get("lng") || "");
    const radius = parseInt(searchParams.get("radius") || "2000"); // meters
    const serviceType = searchParams.get("serviceType");

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
    }

    // Bounding box filter (rough, ~111km per degree latitude)
    const latDelta = radius / 111000;
    const lngDelta = radius / (111000 * Math.cos((lat * Math.PI) / 180));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      status: "VERIFIED",
      latitude: { not: null, gte: lat - latDelta, lte: lat + latDelta },
      longitude: { not: null, gte: lng - lngDelta, lte: lng + lngDelta },
    };

    if (serviceType) {
      const types = serviceType.split(",").map((t) => t.trim()).filter(Boolean);
      if (types.length === 1) where.serviceType = types[0];
      else if (types.length > 1) where.serviceType = { in: types };
    }

    const properties = await prisma.property.findMany({
      where,
      select: {
        id: true, name: true, slug: true, serviceType: true, price: true,
        city: true, address: true, latitude: true, longitude: true,
        avgRating: true, totalReviews: true,
        images: { take: 1, orderBy: { order: "asc" }, select: { url: true } },
      },
      take: 50,
    });

    // Precise haversine filter + distance
    const results = properties
      .map((p) => {
        const dist = haversine(lat, lng, p.latitude!, p.longitude!);
        return { ...p, distance: Math.round(dist) };
      })
      .filter((p) => p.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    return NextResponse.json({ properties: results });
  } catch (error: unknown) {
    console.error("GET /api/properties/nearby error:", error);
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to fetch nearby properties",
        details: process.env.NODE_ENV === "development" ? errMsg : undefined,
      },
      { status: 500 }
    );
  }
}
