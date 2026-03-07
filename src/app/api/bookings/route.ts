import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/bookings — get user's bookings (supports pagination)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "0");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "0"), 100);
    const statusFilter = url.searchParams.get("status") || "";

    const where: any = {};
    const role = (session.user as any)?.role;
    if (role === "STUDENT") {
      where.studentId = session.user.id!;
    } else if (role === "OWNER") {
      where.property = { ownerId: session.user.id! };
    }

    if (statusFilter) {
      where.status = statusFilter;
    }

    const isPaginated = page > 0 && limit > 0;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...(isPaginated ? { skip: (page - 1) * limit, take: limit } : {}),
        include: {
          property: { select: { name: true, slug: true, city: true, serviceType: true, images: { take: 1 } } },
          student: { select: { name: true, email: true, phone: true } },
        },
      }),
      isPaginated ? prisma.booking.count({ where }) : Promise.resolve(0),
    ]);

    return NextResponse.json({
      bookings,
      ...(isPaginated ? { pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } : {}),
    });
  } catch (error) {
    console.error("GET /api/bookings error:", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

// POST /api/bookings — create a booking
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { propertyId, checkIn, checkOut, totalPrice, gstAmount } = await req.json();

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { owner: { select: { commissionPercentage: true } } },
    });
    if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

    const grandTotal = parseFloat(totalPrice) + parseFloat(gstAmount);

    // Calculate commission from owner's individual rate
    const defaultConfig = await prisma.platformConfig.findUnique({ where: { key: "default_commission_rate" } });
    const commissionRate = property.owner.commissionPercentage ?? (defaultConfig ? parseFloat(defaultConfig.value) : 10);
    const commissionAmount = Math.round(grandTotal * commissionRate / 100 * 100) / 100;
    const ownerPayoutAmount = Math.round((grandTotal - commissionAmount) * 100) / 100;

    const booking = await prisma.booking.create({
      data: {
        studentId: session.user.id!,
        propertyId,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        totalPrice: parseFloat(totalPrice),
        gstAmount: parseFloat(gstAmount),
        grandTotal,
        commissionPercentage: commissionRate,
        commissionAmount,
        ownerPayoutAmount,
        status: "PENDING",
      },
    });

    // Award SuperCoins (10 coins per ₹1000 spent, double for premium)
    const user = await prisma.user.findUnique({ where: { id: session.user.id! }, select: { isPremium: true } });
    const coinsEarned = Math.floor(grandTotal / 1000) * 10 * (user?.isPremium ? 2 : 1);
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
