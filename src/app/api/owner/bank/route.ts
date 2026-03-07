import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/owner/bank — get owner's bank details (masked)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { bankAccountName: true, bankAccountNumber: true, bankIfscCode: true, bankAccountType: true },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({
      bankDetails: {
        accountName: user.bankAccountName || "",
        accountNumber: user.bankAccountNumber ? `XXXX${user.bankAccountNumber.slice(-4)}` : "",
        ifscCode: user.bankIfscCode || "",
        accountType: user.bankAccountType || "",
        hasDetails: !!(user.bankAccountNumber && user.bankIfscCode),
      },
    });
  } catch (error) {
    console.error("GET /api/owner/bank error:", error);
    return NextResponse.json({ error: "Failed to fetch bank details" }, { status: 500 });
  }
}

// POST /api/owner/bank — add/update bank details
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { accountName, accountNumber, ifscCode, accountType } = await req.json();

    if (!accountName?.trim() || !accountNumber?.trim() || !ifscCode?.trim()) {
      return NextResponse.json({ error: "Account name, number, and IFSC code are required" }, { status: 400 });
    }

    // Basic IFSC validation
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.trim().toUpperCase())) {
      return NextResponse.json({ error: "Invalid IFSC code format" }, { status: 400 });
    }

    // Basic account number validation (8-18 digits)
    if (!/^\d{8,18}$/.test(accountNumber.trim())) {
      return NextResponse.json({ error: "Invalid account number (8-18 digits)" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        bankAccountName: accountName.trim(),
        bankAccountNumber: accountNumber.trim(),
        bankIfscCode: ifscCode.trim().toUpperCase(),
        bankAccountType: accountType || "savings",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/owner/bank error:", error);
    return NextResponse.json({ error: "Failed to update bank details" }, { status: 500 });
  }
}
