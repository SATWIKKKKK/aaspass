import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/bookings/:id — update booking (e.g. cancel)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    // Verify the booking belongs to this user
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const role = (session.user as any)?.role;

    // Students can only manage their own bookings
    if (role === "STUDENT" && booking.studentId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Owners can only manage bookings for their own properties
    if (role === "OWNER") {
      const property = await prisma.property.findUnique({
        where: { id: booking.propertyId },
        select: { ownerId: true },
      });
      if (!property || property.ownerId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Validate status transitions
    if (body.status === "CANCELLED") {
      if (!["PENDING", "CONFIRMED", "ACTIVE"].includes(booking.status)) {
        return NextResponse.json({ error: "Cannot cancel this booking" }, { status: 400 });
      }
    }

    if (body.status === "COMPLETED") {
      if (role !== "OWNER") {
        return NextResponse.json({ error: "Only owners can mark bookings as completed" }, { status: 403 });
      }
      if (!["CONFIRMED", "ACTIVE"].includes(booking.status)) {
        return NextResponse.json({ error: "Cannot complete this booking" }, { status: 400 });
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = { status: body.status };
    if (body.status === "CANCELLED" || body.status === "COMPLETED") {
      updateData.paymentStatus =
        body.status === "CANCELLED" ? "refund_pending" : "paid";
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        property: { select: { name: true, slug: true, serviceType: true, images: { take: 1 } } },
        student: { select: { name: true, email: true } },
      },
    });

    // Notify the other party
    const notifyUserId =
      role === "OWNER" ? booking.studentId : (await prisma.property.findUnique({ where: { id: booking.propertyId }, select: { ownerId: true } }))?.ownerId;

    if (notifyUserId) {
      const statusLabel = body.status === "CANCELLED" ? "cancelled" : "marked as completed";
      await prisma.notification.create({
        data: {
          userId: notifyUserId,
          type: body.status === "CANCELLED" ? "booking_cancelled" : "booking_completed",
          title: body.status === "CANCELLED" ? "Booking Cancelled" : "Booking Completed",
          message: `Booking for ${updated.property.name} has been ${statusLabel} by the ${role === "OWNER" ? "property owner" : "student"}.`,
          link: role === "OWNER" ? "/dashboard" : "/admin/dashboard",
        },
      });
    }

    return NextResponse.json({ booking: updated });
  } catch (error) {
    console.error("PATCH /api/bookings/:id error:", error);
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}

// GET /api/bookings/:id — get single booking
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        property: { select: { name: true, slug: true, city: true, serviceType: true, images: { take: 1 } } },
        student: { select: { name: true, email: true, phone: true } },
      },
    });

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const role = (session.user as any)?.role;
    if (role === "STUDENT" && booking.studentId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ booking });
  } catch (error) {
    console.error("GET /api/bookings/:id error:", error);
    return NextResponse.json({ error: "Failed to fetch booking" }, { status: 500 });
  }
}
