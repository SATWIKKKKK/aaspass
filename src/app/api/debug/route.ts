import { NextResponse } from "next/server";
import { Pool } from "pg";

// Temporary debug endpoint to check DB connectivity on Vercel
export async function GET() {
  const info: Record<string, unknown> = {
    nodeEnv: process.env.NODE_ENV,
    hasDbUrl: !!process.env.DATABASE_URL,
    dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) + "...",
    timestamp: new Date().toISOString(),
  };

  // Test 1: raw pg pool connection (bypass Prisma entirely)
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 10_000,
  });

  try {
    const res = await pool.query("SELECT count(*) as cnt FROM users");
    info.pgPoolOk = true;
    info.pgPoolResult = res.rows;
  } catch (e: any) {
    info.pgPoolOk = false;
    info.pgPoolError = e.message;
  } finally {
    await pool.end();
  }

  // Test 2: Prisma via adapter
  try {
    const { prisma } = await import("@/lib/prisma");
    const userCount = await prisma.user.count();
    info.prismaOk = true;
    info.userCount = userCount;
  } catch (e: any) {
    info.prismaOk = false;
    info.prismaError = e.message;
    info.prismaCode = e.code;
  }

  return NextResponse.json(info);
}
