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

  // Verify the user is an owner
  const existingUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!existingUser || existingUser.role !== "OWNER") {
    return NextResponse.json({ error: "Only service providers can verify Owner Premium" }, { status: 403 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } =
    await req.json();

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !planId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Verify signature
  const body      = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expected  = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest("hex");

  if (expected !== razorpay_signature) {
    console.error("[Owner Premium] Signature mismatch", {
      userId: session.user.id,
      razorpay_order_id,
    });

    await prisma.paymentLog.create({
      data: {
        userId: session.user.id,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        amount: PLAN_AMOUNT[planId] ?? 0,
        plan: `owner_${planId}`,
        status: "failed",
      },
    }).catch(() => {});

    return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
  }

  // Activate owner premium
  const durationDays = PLAN_DURATION[planId] ?? 30;
  const now          = new Date();
  const expiry       = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  try {
    const [user] = await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: {
          isOwnerPremium:          true,
          ownerPremiumExpiry:      expiry,
          ownerSubscriptionPlan:   planId,
          ownerSubscriptionStart:  now,
          ownerRazorpayPaymentId:  razorpay_payment_id,
          ownerRazorpayOrderId:    razorpay_order_id,
        },
      }),
      prisma.paymentLog.create({
        data: {
          userId:            session.user.id,
          razorpayOrderId:   razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          amount:            PLAN_AMOUNT[planId] ?? 0,
          plan:              `owner_${planId}`,
          status:            "success",
        },
      }),
      prisma.notification.create({
        data: {
          userId:  session.user.id,
          title:   "Owner Premium Activated! 🚀",
          message: `Your Owner Premium ${planId} plan is active until ${expiry.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}. Enjoy boosted visibility, priority support & analytics!`,
          link:    "/admin/dashboard",
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      ownerPremiumExpiry: user.ownerPremiumExpiry?.toISOString(),
    });
  } catch (err) {
    console.error("[Owner Premium] Verify error:", err);
    return NextResponse.json({ error: "Failed to activate Owner Premium" }, { status: 500 });
  }
}
