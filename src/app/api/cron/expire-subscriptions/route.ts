import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/cron/expire-subscriptions
 *
 * Daily cron job that auto-expires premium subscriptions past their end date.
 * Protected by CRON_SECRET env var so only Vercel Cron can call it.
 *
 * Add to vercel.json:
 *   { "crons": [{ "path": "/api/cron/expire-subscriptions", "schedule": "0 0 * * *" }] }
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // In production, require the cron secret
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find all users who are marked premium but whose subscription has expired
    const result = await prisma.user.updateMany({
      where: {
        isPremium: true,
        premiumExpiry: { lt: new Date() },
      },
      data: {
        isPremium: false,
      },
    });

    console.log(`[Cron] Expired ${result.count} premium subscriptions`);

    return NextResponse.json({
      success: true,
      expiredCount: result.count,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Cron] expire-subscriptions error:", err);
    return NextResponse.json({ error: "Failed to run cron" }, { status: 500 });
  }
}
