import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * POST /api/payment/verify-booking
 *
 * Called by Razorpay checkout handler after successful payment.
 * 1. Verifies Razorpay signature (tamper-proof)
 * 2. Creates CONFIRMED booking with payment IDs
 * 3. Awards SuperCoins
 * 4. Notifies student + property owner
 */
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

  // ── Step 1: Verify Razorpay signature ──────────────────────────────────
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    console.error("[verify-booking] Signature mismatch — possible fraud", {
      userId: session.user.id,
      propertyId,
      razorpay_order_id,
    });
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
  }

  // ── Step 2: Idempotency — check if this payment was already processed ──
  const existingBooking = await prisma.booking.findFirst({
    where: { razorpayPaymentId: razorpay_payment_id },
  });
  if (existingBooking) {
    return NextResponse.json({
      success: true,
      bookingId: existingBooking.id,
      bookingReference: existingBooking.bookingNo,
      alreadyProcessed: true,
    });
  }

  try {
    // ── Step 3: Fetch property + owner info ──────────────────────────────
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true } },
        images: { take: 1 },
      },
    });
    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // ── Step 4: Calculate pricing ────────────────────────────────────────
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const daysDiff = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const days = daysDiff > 0 ? daysDiff : 1;
    const perDay = Math.round(property.price / 30);
    const basePrice = perDay * days;
    const gstCalc = Math.round(basePrice * (property.gstRate / 100));
    const grandTotal = basePrice + gstCalc;

    // ── Step 5: Generate human-readable booking reference ────────────────
    const year = new Date().getFullYear();
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    const bookingReference = `BK-${year}-${randomPart}`;

    // ── Step 6: Create booking + notifications + award coins in transaction
    const fmtDate = (d: string) =>
      new Date(d).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

    const student = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, phone: true, isPremium: true },
    });

    const [booking] = await prisma.$transaction([
      // Create booking
      prisma.booking.create({
        data: {
          bookingNo: bookingReference,
          studentId: session.user.id,
          propertyId,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          totalDays: days,
          totalPrice: basePrice,
          gstAmount: gstCalc,
          grandTotal,
          status: "CONFIRMED",
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          paymentStatus: "paid",
        },
      }),

      // Notification for student
      prisma.notification.create({
        data: {
          userId: session.user.id,
          type: "booking_confirmed",
          title: "🎉 Booking Confirmed!",
          message: `Your booking for ${property.name} from ${fmtDate(checkIn)} to ${fmtDate(checkOut)} is confirmed. Booking ID: ${bookingReference}. Amount paid: ₹${grandTotal.toLocaleString("en-IN")}`,
          link: "/dashboard",
        },
      }),

      // Notification for owner
      prisma.notification.create({
        data: {
          userId: property.owner.id,
          type: "new_booking",
          title: "🏠 New Booking Received!",
          message: `${student?.name || "A student"} has booked ${property.name} from ${fmtDate(checkIn)} to ${fmtDate(checkOut)}. Amount: ₹${grandTotal.toLocaleString("en-IN")}. Booking ID: ${bookingReference}`,
          link: "/admin/dashboard",
        },
      }),

      // Award SuperCoins: 10 coins per ₹1000 spent, 2x for premium
      prisma.user.update({
        where: { id: session.user.id },
        data: {
          superCoins: {
            increment:
              Math.floor(grandTotal / 1000) * 10 * (student?.isPremium ? 2 : 1),
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      bookingReference,
      paymentId: razorpay_payment_id,
    });
  } catch (err) {
    console.error("[verify-booking] Error:", err);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}
