import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const FREE_QUOTA_DAYS = 90;

function calcFreeQuota(createdAt: Date) {
  const expiryDate = new Date(createdAt.getTime() + FREE_QUOTA_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();
  const daysRemaining = Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  return { expiryDate, daysRemaining, isWithinFreeQuota: now < expiryDate };
}

// GET /api/payment/free-premium — per-user free quota status from DB
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ isFreePeriod: false, daysRemaining: 0 }, { status: 200 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        createdAt: true, isPremium: true, isOwnerPremium: true,
        premiumGrantType: true, ownerPremiumGrantType: true,
        role: true,
      },
    });

    if (!user) return NextResponse.json({ isFreePeriod: false, daysRemaining: 0 });

    const { expiryDate, daysRemaining, isWithinFreeQuota } = calcFreeQuota(user.createdAt);

    // Already activated free_launch? still show info but mark as already claimed
    const alreadyClaimed =
      (user.role === "STUDENT" && user.isPremium && user.premiumGrantType === "free_launch") ||
      (user.role === "OWNER" && user.isOwnerPremium && user.ownerPremiumGrantType === "free_launch");

    return NextResponse.json({
      isFreePeriod: isWithinFreeQuota && !alreadyClaimed,
      alreadyClaimed,
      registeredAt: user.createdAt.toISOString(),
      freeQuotaExpiryDate: expiryDate.toISOString(),
      daysRemaining,
      isWithinFreeQuota,
    });
  } catch (error) {
    console.error("GET /api/payment/free-premium error:", error);
    return NextResponse.json({ isFreePeriod: false, daysRemaining: 0 }, { status: 500 });
  }
}

// POST /api/payment/free-premium — activate free premium (per-user createdAt based)
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    const userId = session.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        createdAt: true, isPremium: true, isOwnerPremium: true,
        premiumGrantType: true, ownerPremiumGrantType: true,
        name: true, email: true,
      },
    });

    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    const { expiryDate, daysRemaining, isWithinFreeQuota } = calcFreeQuota(user.createdAt);

    if (!isWithinFreeQuota) {
      return NextResponse.json({ success: false, error: "Your 3-month free period has expired. Please subscribe to continue." }, { status: 400 });
    }

    const expiryStr = expiryDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

    if (role === "STUDENT") {
      if (user.isPremium) {
        return NextResponse.json({ success: false, error: "You already have premium" }, { status: 400 });
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          isPremium: true,
          premiumGrantType: "free_launch",
          premiumExpiry: expiryDate,
          subscriptionPlan: "free_launch",
          subscriptionStart: new Date(),
        },
      });

      await prisma.notification.create({
        data: {
          userId,
          title: "🎉 You've got Premium!",
          message: `Your free premium is active for ${daysRemaining} days (until ${expiryStr}). Enjoy AI chat, priority booking, and all premium features!`,
          type: "premium_expiry",
        },
      });
    } else if (role === "OWNER") {
      if (user.isOwnerPremium) {
        return NextResponse.json({ success: false, error: "You already have owner premium" }, { status: 400 });
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          isOwnerPremium: true,
          ownerPremiumGrantType: "free_launch",
          ownerPremiumExpiry: expiryDate,
          ownerSubscriptionPlan: "free_launch",
          ownerSubscriptionStart: new Date(),
        },
      });

      await prisma.notification.create({
        data: {
          userId,
          title: "🎉 You've got Owner Premium!",
          message: `Your free owner premium is active for ${daysRemaining} days (until ${expiryStr}). Your services will now appear at the top of search results!`,
          type: "premium_expiry",
        },
      });
    } else {
      return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });
    }

    // Send confirmation email
    try {
      const roleName = role === "STUDENT" ? "Student" : "Owner";
      await sendEmail({
        to: user.email,
        subject: `🎉 Free ${roleName} Premium Activated — AasPass`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
          <h2 style="color:#059669;">🎉 Free Premium Activated!</h2>
          <p>Hi ${user.name || "there"},</p>
          <p>Your free ${roleName.toLowerCase()} premium is now active for <strong>${daysRemaining} days</strong> until <strong>${expiryStr}</strong>.</p>
          <p>${role === "STUDENT" ? "Enjoy AI chat, priority booking, 2x SuperCoins, and all premium features!" : "Your services will appear at the top of search results with a verified badge. Enjoy boosted visibility!"}</p>
          <p style="color:#6b7280;font-size:12px;margin-top:32px;">— Team AasPass</p>
        </div>`,
      });
    } catch {
      // Email is best-effort, don't fail the activation
    }

    return NextResponse.json({
      success: true,
      premiumExpiry: expiryDate.toISOString(),
      daysRemaining,
      grantType: "free_launch",
    });
  } catch (error) {
    console.error("POST /api/payment/free-premium error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
