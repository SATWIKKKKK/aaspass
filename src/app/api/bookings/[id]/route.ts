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
    if (role === "STUDENT" && booking.studentId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow cancellation of active/pending bookings
    if (body.status === "CANCELLED") {
      if (!["PENDING", "CONFIRMED", "ACTIVE"].includes(booking.status)) {
        return NextResponse.json({ error: "Cannot cancel this booking" }, { status: 400 });
      }
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: body.status },
      include: {
        property: { select: { name: true, slug: true, serviceType: true, images: { take: 1 } } },
      },
    });

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
