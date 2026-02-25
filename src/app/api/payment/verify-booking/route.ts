import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    propertyId,
    checkIn,
    checkOut,
  } = await req.json();

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
  }

  if (!propertyId || !checkIn || !checkOut) {
    return NextResponse.json({ error: "Missing booking details" }, { status: 400 });
  }

  // Verify Razorpay signature
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
  }

  try {
    // Get property for price calculation
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, price: true, gstRate: true },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const gstAmount = Math.round(property.price * (property.gstRate / 100));
    const grandTotal = property.price + gstAmount;

    // Create booking with CONFIRMED status since payment is verified
    const booking = await prisma.booking.create({
      data: {
        studentId: session.user.id,
        propertyId,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        totalPrice: property.price,
        gstAmount,
        grandTotal,
        status: "CONFIRMED",
        notes: `Razorpay Payment ID: ${razorpay_payment_id}`,
      },
    });

    // Create notification for the user
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        title: "Booking Confirmed",
        message: `Your booking has been confirmed! Payment ID: ${razorpay_payment_id}`,
        link: "/dashboard",
      },
    });

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      paymentId: razorpay_payment_id,
    });
  } catch (err) {
    console.error("[verify-booking]", err);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
