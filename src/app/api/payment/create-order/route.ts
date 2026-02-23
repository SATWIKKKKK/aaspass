import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Razorpay from "razorpay";

const PLANS: Record<string, { amount: number; durationDays: number; label: string }> = {
  monthly:   { amount: 9900,  durationDays: 30,  label: "AasPass Premium – Monthly"   },
  quarterly: { amount: 24900, durationDays: 90,  label: "AasPass Premium – Quarterly" },
  yearly:    { amount: 79900, durationDays: 365, label: "AasPass Premium – Yearly"    },
};

let _razorpay: Razorpay | null = null;
function getRazorpay() {
  if (!_razorpay) {
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

  const { planId } = await req.json();
  const plan = PLANS[planId];
  if (!plan) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  try {
    const order = await getRazorpay().orders.create({
      amount:   plan.amount,
      currency: "INR",
      receipt:  `rcpt_${session.user.id}_${Date.now()}`,
      notes:    { planId, userId: session.user.id ?? "", label: plan.label },
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
    const msg = err instanceof Error ? err.message : "Failed to create order";
    console.error("[Razorpay create-order]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
