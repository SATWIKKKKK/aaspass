import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/payment/free-premium — activate free launch premium
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any)?.role;
  const userId = session.user.id;

  // Check if free period is active
  const launchDate = new Date(process.env.PLATFORM_LAUNCH_DATE || "2026-03-01");
  const freeEndDate = new Date(launchDate.getTime() + 90 * 24 * 60 * 60 * 1000);
  const now = new Date();

  if (now >= freeEndDate) {
    return NextResponse.json({ error: "Free premium period has ended" }, { status: 400 });
  }

  // Check if already premium
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPremium: true, isOwnerPremium: true },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (role === "STUDENT") {
    if (user.isPremium) {
      return NextResponse.json({ error: "Already premium" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        isPremium: true,
        premiumGrantType: "free_launch",
        premiumExpiry: freeEndDate,
        subscriptionPlan: "free_launch",
        subscriptionStart: now,
      },
    });
  } else if (role === "OWNER") {
    if (user.isOwnerPremium) {
      return NextResponse.json({ error: "Already premium" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        isOwnerPremium: true,
        ownerPremiumGrantType: "free_launch",
        ownerPremiumExpiry: freeEndDate,
        ownerSubscriptionPlan: "free_launch",
        ownerSubscriptionStart: now,
      },
    });
  }

  await prisma.notification.create({
    data: {
      userId,
      title: "🎉 Free Premium Activated!",
      message: `Your free premium access is now active until ${freeEndDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}. Enjoy all premium features!`,
    },
  });

  return NextResponse.json({
    success: true,
    premiumExpiry: freeEndDate.toISOString(),
    grantType: "free_launch",
  });
}

// GET /api/payment/free-premium — check if free period is active
export async function GET() {
  const launchDate = new Date(process.env.PLATFORM_LAUNCH_DATE || "2026-03-01");
  const freeEndDate = new Date(launchDate.getTime() + 90 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const isFreePeriod = now < freeEndDate;
  const daysRemaining = isFreePeriod ? Math.ceil((freeEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) : 0;

  return NextResponse.json({
    isFreePeriod,
    launchDate: launchDate.toISOString(),
    freeEndDate: freeEndDate.toISOString(),
    daysRemaining,
  });
}
