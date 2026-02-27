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

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[Webhook] Error processing event:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
