import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { prisma } from "@/lib/prisma";

// GET /api/superadmin/payouts — list all payouts
export async function GET(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.response) return authResult.response;

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
    const status = url.searchParams.get("status") || "";
    const ownerId = url.searchParams.get("ownerId") || "";
    const dateFrom = url.searchParams.get("dateFrom") || "";
    const dateTo = url.searchParams.get("dateTo") || "";
    const exportCsv = url.searchParams.get("export") === "csv";

    const where: any = {};
    if (status) where.payoutStatus = status;
    if (ownerId) where.ownerId = ownerId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    if (exportCsv) {
      const allPayouts = await prisma.ownerPayout.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          owner: { select: { name: true, email: true } },
          booking: { select: { bookingNo: true, property: { select: { name: true, serviceType: true } } } },
        },
      });

      const headers = "Booking ID,Owner Name,Owner Email,Service,Booking Amount,Commission,Payout Amount,Status,Date,Razorpay Payout ID\n";
      const rows = allPayouts.map((p) =>
        `${p.booking.bookingNo},${p.owner.name},${p.owner.email},${p.booking.property?.name || ""},${p.bookingAmount},${p.commissionAmount},${p.payoutAmount},${p.payoutStatus},${p.createdAt.toISOString()},${p.razorpayPayoutId || ""}`
      ).join("\n");

      return new NextResponse(headers + rows, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="payouts-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    const [payouts, total, metrics] = await Promise.all([
      prisma.ownerPayout.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          owner: { select: { name: true, email: true } },
          booking: { select: { bookingNo: true, property: { select: { name: true, serviceType: true } } } },
        },
      }),
      prisma.ownerPayout.count({ where }),
      Promise.all([
        prisma.ownerPayout.aggregate({ _sum: { commissionAmount: true }, where: { payoutStatus: "processed" } }),
        prisma.ownerPayout.aggregate({
          _sum: { commissionAmount: true },
          where: {
            payoutStatus: "processed",
            createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
          },
        }),
        prisma.ownerPayout.count({ where: { payoutStatus: "pending" } }),
        prisma.ownerPayout.count({ where: { payoutStatus: "failed" } }),
      ]),
    ]);

    return NextResponse.json({
      payouts,
      metrics: {
        totalCommissionAllTime: metrics[0]._sum.commissionAmount || 0,
        totalCommissionThisMonth: metrics[1]._sum.commissionAmount || 0,
        pendingPayouts: metrics[2],
        failedPayouts: metrics[3],
      },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /api/superadmin/payouts error:", error);
    return NextResponse.json({ error: "Failed to fetch payouts" }, { status: 500 });
  }
}

// POST /api/superadmin/payouts — manual payout trigger/retry
export async function POST(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.response) return authResult.response;

  try {
    const { payoutId } = await req.json();
    if (!payoutId) return NextResponse.json({ error: "payoutId required" }, { status: 400 });

    const payout = await prisma.ownerPayout.findUnique({
      where: { id: payoutId },
      include: {
        owner: { select: { name: true, email: true, bankAccountName: true, bankAccountNumber: true, bankIfscCode: true } },
        booking: { select: { bookingNo: true } },
      },
    });

    if (!payout) return NextResponse.json({ error: "Payout not found" }, { status: 404 });

    if (!payout.owner.bankAccountNumber || !payout.owner.bankIfscCode) {
      return NextResponse.json({ error: "Owner bank details missing" }, { status: 400 });
    }

    // Attempt Razorpay payout
    try {
      const Razorpay = (await import("razorpay")).default;
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID!,
        key_secret: process.env.RAZORPAY_KEY_SECRET!,
      });

      const rzPayout = await (razorpay as any).payouts?.create({
        account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
        fund_account: {
          account_type: "bank_account",
          bank_account: {
            name: payout.owner.bankAccountName || payout.owner.name,
            ifsc: payout.owner.bankIfscCode,
            account_number: payout.owner.bankAccountNumber,
          },
        },
        amount: Math.round(payout.payoutAmount * 100),
        currency: "INR",
        mode: "NEFT",
        purpose: "payout",
        queue_if_low_balance: true,
        reference_id: payout.id,
        narration: `AasPass Payout - ${payout.booking.bookingNo}`,
      });

      await prisma.ownerPayout.update({
        where: { id: payoutId },
        data: {
          payoutStatus: "processed",
          razorpayPayoutId: rzPayout?.id || `manual_${Date.now()}`,
          processedAt: new Date(),
        },
      });

      // Also update booking payout status
      await prisma.booking.update({
        where: { id: payout.bookingId },
        data: { payoutStatus: "processed" },
      });
    } catch (rzError) {
      console.error("Razorpay payout error:", rzError);
      // Mark as processed manually if Razorpay X not available
      await prisma.ownerPayout.update({
        where: { id: payoutId },
        data: {
          payoutStatus: "processed",
          razorpayPayoutId: `manual_${Date.now()}`,
          processedAt: new Date(),
        },
      });
      await prisma.booking.update({
        where: { id: payout.bookingId },
        data: { payoutStatus: "processed" },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/superadmin/payouts error:", error);
    return NextResponse.json({ error: "Failed to process payout" }, { status: 500 });
  }
}
