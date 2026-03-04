import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, createAuditLog } from "@/lib/superadmin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.response) return authResult.response;

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
    const search = url.searchParams.get("search") || "";
    const paymentStatus = url.searchParams.get("paymentStatus") || "";
    const bookingStatus = url.searchParams.get("bookingStatus") || "";
    const sortBy = url.searchParams.get("sortBy") || "createdAt";
    const sortOrder = url.searchParams.get("sortOrder") || "desc";

    const where: any = {};

    if (search) {
      where.OR = [
        { bookingNo: { contains: search, mode: "insensitive" } },
        { student: { name: { contains: search, mode: "insensitive" } } },
        { property: { name: { contains: search, mode: "insensitive" } } },
      ];
    }
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (bookingStatus) where.status = bookingStatus;

    const orderBy: any = {};
    if (sortBy === "grandTotal") orderBy.grandTotal = sortOrder;
    else orderBy.createdAt = sortOrder;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          student: { select: { id: true, name: true, email: true } },
          property: { select: { id: true, name: true, slug: true, serviceType: true, owner: { select: { id: true, name: true } } } },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    return NextResponse.json({
      bookings,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Bookings list error:", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.response) return authResult.response;

  try {
    const { bookingId, action, reason } = await req.json();

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    let updateData: any = {};
    if (action === "mark-paid") {
      updateData = { paymentStatus: "paid" };
    } else if (action === "cancel") {
      updateData = { status: "CANCELLED" };
    } else if (action === "refund") {
      updateData = { paymentStatus: "refunded", status: "CANCELLED" };
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await prisma.booking.update({ where: { id: bookingId }, data: updateData });
    await createAuditLog({
      superadminId: authResult.admin.id,
      actionType: `BOOKING_${action.toUpperCase().replace("-", "_")}`,
      targetType: "BOOKING",
      targetId: bookingId,
      targetName: booking.bookingNo,
      beforeValue: { paymentStatus: booking.paymentStatus, status: booking.status },
      afterValue: updateData,
      reason,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Booking update error:", error);
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}
