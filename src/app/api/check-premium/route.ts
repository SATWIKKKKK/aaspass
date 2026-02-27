import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkPremiumAccess } from "@/lib/premium";

/**
 * GET /api/check-premium
 * Server-side premium status check — the frontend calls this
 * before rendering premium-gated features.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { allowed: false, reason: "Unauthorized" },
      { status: 401 }
    );
  }

  const result = await checkPremiumAccess(session.user.id);

  return NextResponse.json(result);
}
