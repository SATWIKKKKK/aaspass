import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      isOwnerPremium: true,
      ownerPremiumExpiry: true,
      ownerSubscriptionPlan: true,
      ownerSubscriptionStart: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const isActive = user.isOwnerPremium &&
    user.ownerPremiumExpiry &&
    new Date(user.ownerPremiumExpiry) > new Date();

  return NextResponse.json({
    isOwnerPremium: !!isActive,
    ownerPremiumExpiry: user.ownerPremiumExpiry?.toISOString() || null,
    ownerSubscriptionPlan: user.ownerSubscriptionPlan,
    ownerSubscriptionStart: user.ownerSubscriptionStart?.toISOString() || null,
  });
}
