import { NextRequest, NextResponse } from "next/server";
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
        images: true,
        owner: { select: { id: true, name: true, phone: true, image: true } },
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { user: { select: { name: true, image: true } } },
        },
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
