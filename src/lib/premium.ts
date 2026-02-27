import { prisma } from "@/lib/prisma";

/**
 * Check if a user has an active premium subscription.
 * Verifies from the database — never trust JWT/session alone.
 * Auto-expires subscriptions that have passed their end date.
 */
export async function checkPremiumAccess(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  premiumExpiry?: string;
  plan?: string;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      isPremium: true,
      premiumExpiry: true,
      subscriptionPlan: true,
    },
  });

  if (!user) {
    return { allowed: false, reason: "User not found" };
  }

  if (!user.isPremium) {
    return { allowed: false, reason: "No active subscription" };
  }

  // Check if subscription has expired
  if (!user.premiumExpiry || new Date(user.premiumExpiry) < new Date()) {
    // Auto-expire: update DB so future checks are fast
    await prisma.user.update({
      where: { id: userId },
      data: { isPremium: false },
    });
    return { allowed: false, reason: "Subscription expired" };
  }

  return {
    allowed: true,
    premiumExpiry: user.premiumExpiry.toISOString(),
    plan: user.subscriptionPlan ?? undefined,
  };
}
