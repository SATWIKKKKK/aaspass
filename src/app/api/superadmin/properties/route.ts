import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { createPropertyForAccount, SuperAdminCreationError } from "@/lib/superadmin-creation";

export async function POST(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.response) return authResult.response;

  try {
    const body = await req.json();
    const result = await createPropertyForAccount(
      body,
      authResult.admin.id,
      body.reason || "Property created from Super Admin"
    );

    return NextResponse.json({
      success: true,
      property: result.property,
      owner: result.owner,
      promotedOwner: result.promoted,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof SuperAdminCreationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Superadmin property create error:", error);
    return NextResponse.json({ error: "Failed to create property" }, { status: 500 });
  }
}
