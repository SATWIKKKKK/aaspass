import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PLAN_DURATION: Record<string, number> = {
  monthly:   30,
  quarterly: 90,
  yearly:    365,
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
    console.error("[Razorpay] Signature mismatch");
    return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
  }

  // Activate premium
  const durationDays = PLAN_DURATION[planId] ?? 30;
  const expiry       = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data:  { isPremium: true, premiumExpiry: expiry },
    });

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
