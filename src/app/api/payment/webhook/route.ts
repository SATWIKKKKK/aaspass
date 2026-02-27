import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";

const PLAN_DURATION: Record<string, number> = {
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

const PLAN_AMOUNT: Record<string, number> = {
  monthly: 9900,
  quarterly: 24900,
  yearly: 79900,
};

/**
 * Razorpay Webhook — backup handler for cases where the user closes
 * the browser before the frontend handler fires.
 *
 * Set this URL in Razorpay Dashboard → Settings → Webhooks:
 *   https://aaspass-gamma.vercel.app/api/payment/webhook
 *
 * Event: payment.captured
 * Secret: RAZORPAY_WEBHOOK_SECRET env var
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[Webhook] RAZORPAY_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // Verify webhook signature
  const expectedSig = createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  if (expectedSig !== signature) {
    console.error("[Webhook] Signature mismatch — rejecting");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const event = JSON.parse(rawBody);

    if (event.event === "payment.captured") {
      const payment = event.payload?.payment?.entity;
      if (!payment) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
      }

      const { order_id, id: paymentId, notes } = payment;
      const userId = notes?.userId;
      const planId = notes?.planId;

      if (!userId || !planId) {
        console.error("[Webhook] Missing userId or planId in payment notes", { order_id });
        return NextResponse.json({ received: true });
      }

      // Check if payment was already processed (idempotency)
      const existingLog = await prisma.paymentLog.findFirst({
        where: { razorpayPaymentId: paymentId, status: "success" },
      });

      if (existingLog) {
        // Already processed by the verify endpoint — skip
        return NextResponse.json({ received: true, alreadyProcessed: true });
      }

      // Activate premium
      const durationDays = PLAN_DURATION[planId] ?? 30;
      const now = new Date();
      const expiry = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: {
            isPremium: true,
            premiumExpiry: expiry,
            subscriptionPlan: planId,
            subscriptionStart: now,
            razorpayPaymentId: paymentId,
            razorpayOrderId: order_id,
          },
        }),
        prisma.paymentLog.create({
          data: {
            userId,
            razorpayOrderId: order_id,
            razorpayPaymentId: paymentId,
            amount: PLAN_AMOUNT[planId] ?? 0,
            plan: planId,
            status: "success",
          },
        }),
        prisma.notification.create({
          data: {
            userId,
            title: "Welcome to Premium! 🎉",
            message: `Your ${planId} premium subscription is now active until ${expiry.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.`,
            link: "/chat",
          },
        }),
      ]);

      console.log(`[Webhook] Premium activated for user ${userId}, plan: ${planId}`);
    }

    // ── Handle booking payments ──────────────────────────────────────────
    if (event.event === "payment.captured") {
      const payment = event.payload?.payment?.entity;
      if (payment) {
        const { order_id, id: paymentId, notes } = payment;

        if (notes?.type === "booking" && notes?.propertyId && notes?.userId) {
          // Check idempotency
          const existingBooking = await prisma.booking.findFirst({
            where: { razorpayPaymentId: paymentId },
          });

          if (!existingBooking) {
            const property = await prisma.property.findUnique({
              where: { id: notes.propertyId },
              include: {
                owner: { select: { id: true, name: true } },
              },
            });

            if (property) {
              const checkInDate = new Date(notes.checkIn);
              const checkOutDate = new Date(notes.checkOut);
              const daysDiff = Math.ceil(
                (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
              );
              const days = daysDiff > 0 ? daysDiff : 1;
              const perDay = Math.round(property.price / 30);
              const basePrice = perDay * days;
              const gstCalc = Math.round(basePrice * (property.gstRate / 100));
              const grandTotal = basePrice + gstCalc;

              const year = new Date().getFullYear();
              const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
              const bookingReference = `BK-${year}-${randomPart}`;

              const fmtDate = (d: string) =>
                new Date(d).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                });

              const student = await prisma.user.findUnique({
                where: { id: notes.userId },
                select: { name: true, isPremium: true },
              });

              await prisma.$transaction([
                prisma.booking.create({
                  data: {
                    bookingNo: bookingReference,
                    studentId: notes.userId,
                    propertyId: notes.propertyId,
                    checkIn: checkInDate,
                    checkOut: checkOutDate,
                    totalDays: days,
                    totalPrice: basePrice,
                    gstAmount: gstCalc,
                    grandTotal,
                    status: "CONFIRMED",
                    razorpayOrderId: order_id,
                    razorpayPaymentId: paymentId,
                    razorpaySignature: "webhook",
                    paymentStatus: "paid",
                  },
                }),
                prisma.notification.create({
                  data: {
                    userId: notes.userId,
                    type: "booking_confirmed",
                    title: "\uD83C\uDF89 Booking Confirmed!",
                    message: `Your booking for ${property.name} from ${fmtDate(notes.checkIn)} to ${fmtDate(notes.checkOut)} is confirmed. Booking ID: ${bookingReference}`,
                    link: "/dashboard",
                  },
                }),
                prisma.notification.create({
                  data: {
                    userId: property.owner.id,
                    type: "new_booking",
                    title: "\uD83C\uDFE0 New Booking Received!",
                    message: `${student?.name || "A student"} has booked ${property.name} from ${fmtDate(notes.checkIn)} to ${fmtDate(notes.checkOut)}. Amount: \u20B9${grandTotal.toLocaleString("en-IN")}. Booking ID: ${bookingReference}`,
                    link: "/admin/dashboard",
                  },
                }),
                prisma.user.update({
                  where: { id: notes.userId },
                  data: {
                    superCoins: {
                      increment:
                        Math.floor(grandTotal / 1000) * 10 * (student?.isPremium ? 2 : 1),
                    },
                  },
                }),
              ]);

              console.log(`[Webhook] Booking ${bookingReference} created for user ${notes.userId}`);
            }
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[Webhook] Error processing event:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
