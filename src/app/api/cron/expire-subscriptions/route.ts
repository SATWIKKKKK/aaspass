import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, premiumExpiryReminderEmail } from "@/lib/email";

/**
 * GET /api/cron/expire-subscriptions
 *
 * Daily cron job that:
 * 1. Auto-expires premium subscriptions past their end date
 * 2. Sends reminders 7 days and 1 day before expiry
 * 3. Handles both student and owner premium
 * Protected by CRON_SECRET env var so only Vercel Cron can call it.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const fourteenDaysFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    // 1. Expire student premium
    const expiredStudents = await prisma.user.updateMany({
      where: { isPremium: true, premiumExpiry: { lt: now } },
      data: { isPremium: false },
    });

    // 2. Expire owner premium
    const expiredOwners = await prisma.user.updateMany({
      where: { isOwnerPremium: true, ownerPremiumExpiry: { lt: now } },
      data: { isOwnerPremium: false },
    });

    // 3. Send 14/7/1-day reminder for student premium
    const reminderStudents = await prisma.user.findMany({
      where: {
        isPremium: true,
        premiumExpiry: { gt: now, lte: fourteenDaysFromNow },
      },
      select: { id: true, name: true, email: true, premiumExpiry: true },
    });

    for (const user of reminderStudents) {
      const daysLeft = Math.ceil((user.premiumExpiry!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      if (daysLeft === 14 || daysLeft === 7 || daysLeft === 1) {
        await prisma.notification.create({
          data: {
            userId: user.id,
            title: daysLeft === 1 ? "⚠️ Premium Expires Tomorrow!" : `Premium Expires in ${daysLeft} Days`,
            message: `Your free premium expires ${daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`}. Subscribe now to continue enjoying premium benefits.`,
            type: "student_premium_expiry",
          },
        });

        const emailContent = premiumExpiryReminderEmail(user.name, daysLeft, "₹99/month");
        sendEmail({ to: user.email, ...emailContent }).catch(console.error);
      }
    }

    // 4. Send 14/7/1-day reminder for owner premium
    const reminderOwners = await prisma.user.findMany({
      where: {
        isOwnerPremium: true,
        ownerPremiumExpiry: { gt: now, lte: fourteenDaysFromNow },
      },
      select: { id: true, name: true, email: true, ownerPremiumExpiry: true },
    });

    for (const owner of reminderOwners) {
      const daysLeft = Math.ceil((owner.ownerPremiumExpiry!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      if (daysLeft === 14 || daysLeft === 7 || daysLeft === 1) {
        await prisma.notification.create({
          data: {
            userId: owner.id,
            title: daysLeft === 1 ? "⚠️ Owner Premium Expires Tomorrow!" : `Owner Premium Expires in ${daysLeft} Days`,
            message: `Your owner premium expires ${daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`}. Renew to keep boosted visibility and promotion.`,
            type: "owner_premium_expiry",
          },
        });

        const emailContent = premiumExpiryReminderEmail(owner.name, daysLeft, "₹99/month");
        sendEmail({ to: owner.email, ...emailContent }).catch(console.error);
      }
    }

    // 5. Create expiry notifications for users who just lost premium
    if (expiredStudents.count > 0 || expiredOwners.count > 0) {
      const justExpired = await prisma.user.findMany({
        where: {
          OR: [
            { isPremium: false, premiumExpiry: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), lt: now } },
            { isOwnerPremium: false, ownerPremiumExpiry: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), lt: now } },
          ],
        },
        select: { id: true },
      });

      if (justExpired.length > 0) {
        // Re-fetch to know what type each user has (student vs owner expired)
        const justExpiredStudents = await prisma.user.findMany({
          where: {
            isPremium: false,
            premiumExpiry: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), lt: now },
          },
          select: { id: true },
        });
        const justExpiredOwners = await prisma.user.findMany({
          where: {
            isOwnerPremium: false,
            ownerPremiumExpiry: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), lt: now },
          },
          select: { id: true },
        });
        if (justExpiredStudents.length > 0) {
          await prisma.notification.createMany({
            data: justExpiredStudents.map((u) => ({
              userId: u.id,
              title: "Premium Expired",
              message: "Your student premium has expired. Subscribe now to continue enjoying premium benefits.",
              type: "student_premium_expiry",
            })),
          });
        }
        if (justExpiredOwners.length > 0) {
          await prisma.notification.createMany({
            data: justExpiredOwners.map((u) => ({
              userId: u.id,
              title: "Owner Premium Expired",
              message: "Your owner premium has expired. Renew to keep boosted visibility and promotion.",
              type: "owner_premium_expiry",
            })),
          });
        }
      }
    }

    console.log(`[Cron] Expired ${expiredStudents.count} student + ${expiredOwners.count} owner subscriptions, sent ${reminderStudents.length + reminderOwners.length} reminders`);

    return NextResponse.json({
      success: true,
      expiredStudents: expiredStudents.count,
      expiredOwners: expiredOwners.count,
      remindersSent: reminderStudents.length + reminderOwners.length,
      timestamp: now.toISOString(),
    });
  } catch (err) {
    console.error("[Cron] expire-subscriptions error:", err);
    return NextResponse.json({ error: "Failed to run cron" }, { status: 500 });
  }
}
