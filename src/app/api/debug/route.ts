import { NextResponse } from "next/server";

// Health-check endpoint
export async function GET() {
  try {
    const { prisma } = await import("@/lib/prisma");
    const count = await prisma.user.count();
    return NextResponse.json({ ok: true, users: count });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
