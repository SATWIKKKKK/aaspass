import { NextResponse } from "next/server";
import { clearSuperAdminCookie } from "@/lib/superadmin-auth";

export async function POST() {
  await clearSuperAdminCookie();
  return NextResponse.json({ success: true });
}
