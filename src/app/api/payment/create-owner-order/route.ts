import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const OWNER_PLANS: Record<string, { amount: number; durationDays: number; label: string }> = {
  monthly:   { amount: 9900,  durationDays: 30,  label: "Owner Premium – Monthly"   },
  quarterly: { amount: 24900, durationDays: 90,  label: "Owner Premium – Quarterly" },
  yearly:    { amount: 79900, durationDays: 365, label: "Owner Premium – Yearly"    },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _razorpay: any = null;
async function getRazorpay() {
  if (!_razorpay) {
    const Razorpay = (await import("razorpay")).default;
    _razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }
  return _razorpay;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id ?? "unknown";

  // Only owners can purchase owner premium
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isOwnerPremium: true, ownerPremiumExpiry: true },
  });

  if (!user || user.role !== "OWNER") {
    return NextResponse.json({ error: "Only service providers can purchase Owner Premium" }, { status: 403 });
  }

  if (
    user.isOwnerPremium &&
    user.ownerPremiumExpiry &&
    new Date(user.ownerPremiumExpiry) > new Date()
  ) {
    return NextResponse.json(
      { error: "You already have an active Owner Premium subscription" },
      { status: 400 }
    );
  }

  const { planId } = await req.json();
  const plan = OWNER_PLANS[planId];
  if (!plan) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  try {
    const razorpay = await getRazorpay();
    const shortId = userId.slice(-8);
    const receipt = `own_${shortId}_${Date.now()}`.slice(0, 40);
    const order = await razorpay.orders.create({
      amount:   plan.amount,
      currency: "INR",
      receipt,
      notes:    { planId, userId, label: plan.label, type: "owner_premium" },
    });

    return NextResponse.json({
      orderId:      order.id,
      amount:       order.amount,
      currency:     order.currency,
      planId,
      durationDays: plan.durationDays,
      keyId:        process.env.RAZORPAY_KEY_ID,
    });
  } catch (err: unknown) {
    const rzError = (err as any)?.error;
    const msg = rzError?.description
      || (err instanceof Error ? err.message : "")
      || JSON.stringify(err);
    console.error("[Owner Premium] Create order error:", msg);
    return NextResponse.json({ error: "Failed to create payment order" }, { status: 500 });
  }
}
