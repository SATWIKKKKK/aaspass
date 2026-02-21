import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/reviews
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { propertyId, rating, comment } = await req.json();

    if (!propertyId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Check if user has a booking for this property
    const booking = await prisma.booking.findFirst({
      where: { studentId: session.user.id!, propertyId, status: { in: ["CONFIRMED", "COMPLETED"] } },
    });
    if (!booking) {
      return NextResponse.json({ error: "You can only review properties you've booked" }, { status: 403 });
    }

    // Check existing review
    const existing = await prisma.review.findFirst({
      where: { userId: session.user.id!, propertyId },
    });
    if (existing) {
      return NextResponse.json({ error: "You've already reviewed this property" }, { status: 409 });
    }

    const review = await prisma.review.create({
      data: {
        userId: session.user.id!,
        propertyId,
        rating,
        comment: comment || null,
      },
    });

    // Update property average rating
    const agg = await prisma.review.aggregate({
      where: { propertyId },
      _avg: { rating: true },
      _count: true,
    });
    await prisma.property.update({
      where: { id: propertyId },
      data: {
        avgRating: agg._avg.rating || 0,
        totalReviews: agg._count,
      },
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    console.error("POST /api/reviews error:", error);
    return NextResponse.json({ error: "Failed to create review" }, { status: 500 });
  }
}
