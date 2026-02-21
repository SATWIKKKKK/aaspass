import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/bookings — get user's bookings
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const where: any = {};
    if (session.user?.role === "STUDENT") {
      where.studentId = session.user.id!;
    } else if (session.user?.role === "OWNER") {
      where.property = { ownerId: session.user.id! };
    }

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        property: { select: { name: true, slug: true, city: true, serviceType: true, images: { take: 1 } } },
        student: { select: { name: true, email: true, phone: true } },
      },
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("GET /api/bookings error:", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

// POST /api/bookings — create a booking
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { propertyId, checkIn, checkOut, totalPrice, gstAmount } = await req.json();

    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

    const grandTotal = parseFloat(totalPrice) + parseFloat(gstAmount);

    const booking = await prisma.booking.create({
      data: {
        studentId: session.user.id!,
        propertyId,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        totalPrice: parseFloat(totalPrice),
        gstAmount: parseFloat(gstAmount),
        grandTotal,
        status: "PENDING",
      },
    });

    // Award SuperCoins (10 coins per ₹1000 spent, double for premium)
    const coinsEarned = Math.floor(grandTotal / 1000) * 10 * (session.user?.isPremium ? 2 : 1);
    await prisma.user.update({
      where: { id: session.user.id! },
      data: { superCoins: { increment: coinsEarned } },
    });

    // Notify owner
    await prisma.notification.create({
      data: {
        userId: property.ownerId,
        title: "New Booking",
        message: `${session.user.name} has booked ${property.name}`,
      },
    });

    return NextResponse.json({ booking, coinsEarned }, { status: 201 });
  } catch (error) {
    console.error("POST /api/bookings error:", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
