import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _razorpay: any = null;
async function getRazorpay() {
  if (!_razorpay) {
    const Razorpay = (await import("razorpay")).default;
    _razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }
  return _razorpay;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { propertyId, checkIn, checkOut } = await req.json();
  if (!propertyId || !checkIn || !checkOut) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    // Get property details for pricing
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, name: true, price: true, gstRate: true },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Calculate dynamic pricing based on date range
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const daysDiff = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    const days = daysDiff > 0 ? daysDiff : 1;
    const perDay = Math.round(property.price / 30);
    const basePrice = perDay * days;
    const gst = Math.round(basePrice * (property.gstRate / 100));
    const totalAmount = basePrice + gst;
    // Razorpay expects amount in paise
    const amountInPaise = Math.round(totalAmount * 100);

    const razorpay = await getRazorpay();
    const shortId = session.user.id.slice(-8);
    const receipt = `bk_${shortId}_${Date.now()}`.slice(0, 40);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt,
      notes: {
        type: "booking",
        propertyId,
        userId: session.user.id,
        propertyName: property.name,
        checkIn,
        checkOut,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      propertyName: property.name,
      perDay,
      days,
      basePrice,
      gst,
      totalAmount,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rzError = (err as any)?.error;
    const msg = rzError?.description || (err instanceof Error ? err.message : "") || JSON.stringify(err);
    console.error("[Razorpay create-booking-order]", JSON.stringify(err, null, 2));
    return NextResponse.json({ error: msg || "Failed to create order" }, { status: 500 });
  }
}
