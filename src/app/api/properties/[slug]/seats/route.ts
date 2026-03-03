import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/properties/[slug]/seats — quick update available seats
export async function PATCH(
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
      select: { id: true, capacity: true, availableRooms: true },
    });

    if (!property) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    const body = await req.json();
    const { availableRooms } = body;

    if (availableRooms === undefined || availableRooms === null) {
      return NextResponse.json({ error: "availableRooms is required" }, { status: 400 });
    }

    const newAvailable = Math.max(0, parseInt(availableRooms));
    if (property.capacity && newAvailable > property.capacity) {
      return NextResponse.json(
        { error: `Cannot exceed total capacity of ${property.capacity}` },
        { status: 400 }
      );
    }

    const updated = await prisma.property.update({
      where: { id: property.id },
      data: { availableRooms: newAvailable },
      select: { availableRooms: true, capacity: true },
    });

    return NextResponse.json({
      availableRooms: updated.availableRooms,
      capacity: updated.capacity,
    });
  } catch (error) {
    console.error("PATCH /api/properties/[slug]/seats error:", error);
    return NextResponse.json({ error: "Failed to update seats" }, { status: 500 });
  }
}
