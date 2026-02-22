import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// SuperCoin earning rates
const COIN_RATES = {
  BOOKING: 50,           // per booking
  BOOKING_PREMIUM: 100,  // per booking (premium users: 2x)
  REVIEW: 20,            // per review made
  REFERRAL: 500,         // per successful referral
  DAILY_LOGIN: 5,        // daily login bonus
};

// 1 SuperCoin = ₹1 value for discounts
const COIN_VALUE = 1;

// GET /api/supercoins — get balance and transaction history
export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id! },
      select: { superCoins: true, isPremium: true },
    });

    // Get recent bookings to show earnings
    const bookings = await prisma.booking.findMany({
      where: { studentId: session.user.id! },
      select: { id: true, bookingNo: true, createdAt: true, grandTotal: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Get reviews
    const reviews = await prisma.review.findMany({
      where: { userId: session.user.id! },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const coinRate = user?.isPremium ? COIN_RATES.BOOKING_PREMIUM : COIN_RATES.BOOKING;

    return NextResponse.json({
      balance: user?.superCoins || 0,
      value: (user?.superCoins || 0) * COIN_VALUE,
      isPremium: user?.isPremium || false,
      rates: {
        perBooking: coinRate,
        perReview: COIN_RATES.REVIEW,
        perReferral: COIN_RATES.REFERRAL,
        dailyLogin: COIN_RATES.DAILY_LOGIN,
      },
      recentActivity: [
        ...bookings.map((b) => ({
          type: "BOOKING" as const,
          description: `Booking #${b.bookingNo}`,
          coins: coinRate,
          date: b.createdAt,
          status: b.status,
        })),
        ...reviews.map((r) => ({
          type: "REVIEW" as const,
          description: "Review submitted",
          coins: COIN_RATES.REVIEW,
          date: r.createdAt,
          status: "EARNED",
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15),
    });
  } catch (error) {
    console.error("GET /api/supercoins error:", error);
    return NextResponse.json({ error: "Failed to fetch SuperCoins" }, { status: 500 });
  }
}

// POST /api/supercoins — earn or redeem coins
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { action, amount } = await req.json();

    const user = await prisma.user.findUnique({
      where: { id: session.user.id! },
      select: { superCoins: true, isPremium: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (action === "earn") {
      // Earn coins for a specific action
      const earnAmount = amount || (user.isPremium ? COIN_RATES.BOOKING_PREMIUM : COIN_RATES.BOOKING);

      const updated = await prisma.user.update({
        where: { id: session.user.id! },
        data: { superCoins: { increment: earnAmount } },
        select: { superCoins: true },
      });

      return NextResponse.json({
        success: true,
        earned: earnAmount,
        newBalance: updated.superCoins,
        message: `You earned ${earnAmount} SuperCoins!`,
      });
    }

    if (action === "redeem") {
      // Redeem coins for discount
      if (!amount || amount <= 0) {
        return NextResponse.json({ error: "Invalid redeem amount" }, { status: 400 });
      }
      if (amount > user.superCoins) {
        return NextResponse.json({ error: "Insufficient SuperCoins" }, { status: 400 });
      }

      const discount = amount * COIN_VALUE;
      const updated = await prisma.user.update({
        where: { id: session.user.id! },
        data: { superCoins: { decrement: amount } },
        select: { superCoins: true },
      });

      return NextResponse.json({
        success: true,
        redeemed: amount,
        discount,
        newBalance: updated.superCoins,
        message: `Redeemed ${amount} SuperCoins for ₹${discount} discount!`,
      });
    }

    return NextResponse.json({ error: "Invalid action. Use 'earn' or 'redeem'" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/supercoins error:", error);
    return NextResponse.json({ error: "Failed to process SuperCoins" }, { status: 500 });
  }
}
