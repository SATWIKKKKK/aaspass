import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const PLANS: Record<string, { amount: number; durationDays: number; label: string }> = {
  monthly:   { amount: 9900,  durationDays: 30,  label: "AasPass Premium – Monthly"   },
  quarterly: { amount: 24900, durationDays: 90,  label: "AasPass Premium – Quarterly" },
  yearly:    { amount: 79900, durationDays: 365, label: "AasPass Premium – Yearly"    },
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

  const { planId } = await req.json();
  const plan = PLANS[planId];
  if (!plan) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const userId = (session.user as any).id ?? "unknown";

  try {
    const razorpay = await getRazorpay();
    // Razorpay receipt max 40 chars — use short id + timestamp suffix
    const shortId = userId.slice(-8);
    const receipt = `rcpt_${shortId}_${Date.now()}`.slice(0, 40);
    const order = await razorpay.orders.create({
      amount:   plan.amount,
      currency: "INR",
      receipt,
      notes:    { planId, userId, label: plan.label },
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
    // Razorpay SDK throws { error: { code, description, source, ... } }
    const rzError = (err as any)?.error;
    const msg = rzError?.description
      || (err instanceof Error ? err.message : "")
      || JSON.stringify(err);
    console.error("[Razorpay create-order]", JSON.stringify(err, null, 2));
    return NextResponse.json({ error: msg || "Failed to create order" }, { status: 500 });
  }
}
