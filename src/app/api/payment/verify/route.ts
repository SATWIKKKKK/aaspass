import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PLAN_DURATION: Record<string, number> = {
  monthly:   30,
  quarterly: 90,
  yearly:    365,
};

const PLAN_AMOUNT: Record<string, number> = {
  monthly:   9900,
  quarterly: 24900,
  yearly:    79900,
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } =
    await req.json();

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !planId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Verify signature: HMAC-SHA256 of "order_id|payment_id" with key_secret
  const body      = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expected  = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest("hex");

  if (expected !== razorpay_signature) {
    console.error("[Razorpay] Signature mismatch — possible tampering", {
      userId: session.user.id,
      razorpay_order_id,
    });

    // Log failed attempt
    await prisma.paymentLog.create({
      data: {
        userId: session.user.id,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        amount: PLAN_AMOUNT[planId] ?? 0,
        plan: planId,
        status: "failed",
      },
    }).catch(() => {});

    return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
  }

  // Activate premium
  const durationDays = PLAN_DURATION[planId] ?? 30;
  const now          = new Date();
  const expiry       = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  try {
    // Update user + log payment in a transaction
    const [user] = await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: {
          isPremium:         true,
          premiumExpiry:     expiry,
          subscriptionPlan:  planId,
          subscriptionStart: now,
          razorpayPaymentId: razorpay_payment_id,
          razorpayOrderId:   razorpay_order_id,
        },
      }),
      prisma.paymentLog.create({
        data: {
          userId:            session.user.id,
          razorpayOrderId:   razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          amount:            PLAN_AMOUNT[planId] ?? 0,
          plan:              planId,
          status:            "success",
        },
      }),
      prisma.notification.create({
        data: {
          userId:  session.user.id,
          title:   "Welcome to Premium! 🎉",
          message: `Your ${planId} premium subscription is now active until ${expiry.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}. Enjoy AI Chat, priority booking & more!`,
          link:    "/chat",
        },
      }),
    ]);

    return NextResponse.json({
      success:       true,
      premiumExpiry: expiry.toISOString(),
      planId,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to activate premium";
    console.error("[Razorpay verify]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
