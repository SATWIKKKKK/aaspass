import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, unknown> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
  };

  // Test database connection
  try {
    const count = await prisma.property.count();
    checks.db = "connected";
    checks.propertyCount = count;
  } catch (e: any) {
    checks.db = "error";
    checks.dbError = e?.message || "Unknown DB error";
    checks.status = "degraded";
  }

  // Check critical environment variables exist (without exposing values)
  checks.env = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET || !!process.env.AUTH_SECRET,
    GOOGLE_MAPS_API_KEY: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    RAZORPAY_KEY_ID: !!process.env.RAZORPAY_KEY_ID,
    GROQ_API_KEY: !!process.env.GROQ_API_KEY,
  };

  const statusCode = checks.status === "ok" ? 200 : 503;
  return NextResponse.json(checks, { status: statusCode });
}
