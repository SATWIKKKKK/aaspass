import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Temporary debug endpoint to check DB connectivity on Vercel
export async function GET() {
  const info: Record<string, unknown> = {
    nodeEnv: process.env.NODE_ENV,
    hasDbUrl: !!process.env.DATABASE_URL,
    dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) + "...",
    timestamp: new Date().toISOString(),
  };

  try {
    // Test 1: simple count
    const userCount = await prisma.user.count();
    info.userCount = userCount;
    info.dbConnected = true;
  } catch (e: any) {
    info.dbConnected = false;
    info.dbError = e.message;
    info.dbErrorCode = e.code;
    info.dbErrorName = e.name;
  }

  try {
    // Test 2: property count
    const propCount = await prisma.property.count();
    info.propCount = propCount;
  } catch (e: any) {
    info.propError = e.message;
  }

  return NextResponse.json(info);
}
