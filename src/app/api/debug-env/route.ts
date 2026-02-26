import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ⚠️ TEMPORARY DEBUG ENDPOINT — Remove after verifying production env vars
// This endpoint does NOT expose full secrets, only existence + prefix
export async function GET() {
  const envStatus = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: {
      exists: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
      prefix: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.substring(0, 10) + "...",
    },
    DATABASE_URL: {
      exists: !!process.env.DATABASE_URL,
      prefix: process.env.DATABASE_URL?.substring(0, 25) + "...",
    },
    NEXTAUTH_SECRET: { exists: !!process.env.NEXTAUTH_SECRET },
    AUTH_SECRET: { exists: !!process.env.AUTH_SECRET },
    GOOGLE_CLIENT_ID: { exists: !!process.env.GOOGLE_CLIENT_ID },
    GOOGLE_CLIENT_SECRET: { exists: !!process.env.GOOGLE_CLIENT_SECRET },
    RAZORPAY_KEY_ID: { exists: !!process.env.RAZORPAY_KEY_ID },
    RAZORPAY_KEY_SECRET: { exists: !!process.env.RAZORPAY_KEY_SECRET },
    NEXT_PUBLIC_RAZORPAY_KEY_ID: { exists: !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID },
    GROQ_API_KEY: { exists: !!process.env.GROQ_API_KEY },
  };

  return NextResponse.json({
    warning: "⚠️ TEMPORARY DEBUG ENDPOINT — Remove after verifying production deployment",
    timestamp: new Date().toISOString(),
    ...envStatus,
  });
}
