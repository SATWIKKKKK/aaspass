import { NextResponse } from "next/server";
import { getSuperAdminFromCookie } from "@/lib/superadmin-auth";

export async function GET() {
  const admin = await getSuperAdminFromCookie();
  if (!admin) {
    return NextResponse.json({ admin: null }, { status: 401 });
  }
  return NextResponse.json({ admin: { id: admin.id, name: admin.name, email: admin.email } });
}
