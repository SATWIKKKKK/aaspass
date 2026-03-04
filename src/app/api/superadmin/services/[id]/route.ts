import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, createAuditLog } from "@/lib/superadmin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.response) return authResult.response;
  const { id } = await params;

  try {
    const service = await prisma.property.findUnique({
      where: { id },
      include: {
        images: true,
        owner: { select: { id: true, name: true, email: true, phone: true } },
        bookings: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { student: { select: { id: true, name: true, email: true } } },
        },
        reviews: {
          orderBy: { createdAt: "desc" },
          include: { user: { select: { id: true, name: true } } },
        },
        pricingPlans: true,
        serviceStudents: { orderBy: { createdAt: "desc" } },
        _count: {
          select: {
            bookings: true, reviews: true, visits: true,
            wishlistItems: true, cartItems: true,
          },
        },
      },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    return NextResponse.json({ service });
  } catch (error) {
    console.error("Service detail error:", error);
    return NextResponse.json({ error: "Failed to fetch service" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.response) return authResult.response;
  const { id } = await params;

  try {
    const body = await req.json();
    const { reason, ...updateData } = body;

    const service = await prisma.property.findUnique({ where: { id } });
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const allowedFields = [
      "name", "description", "status", "price", "capacity", "availableRooms",
      "address", "city", "state", "pincode", "isAC", "hasWifi", "foodIncluded",
      "laundryIncluded", "occupancy", "closingTime", "rules", "cancellationPolicy",
    ];

    const filteredUpdate: any = {};
    const beforeValue: any = {};
    for (const key of allowedFields) {
      if (updateData[key] !== undefined) {
        filteredUpdate[key] = updateData[key];
        beforeValue[key] = (service as any)[key];
      }
    }

    if (Object.keys(filteredUpdate).length > 0) {
      await prisma.property.update({ where: { id }, data: filteredUpdate });
      await createAuditLog({
        superadminId: authResult.admin.id,
        actionType: "EDIT_SERVICE",
        targetType: "SERVICE",
        targetId: id,
        targetName: service.name,
        beforeValue,
        afterValue: filteredUpdate,
        reason,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Service update error:", error);
    return NextResponse.json({ error: "Failed to update service" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.response) return authResult.response;
  const { id } = await params;

  try {
    const service = await prisma.property.findUnique({ where: { id } });
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));

    await prisma.property.update({ where: { id }, data: { status: "SUSPENDED" } });
    await createAuditLog({
      superadminId: authResult.admin.id,
      actionType: "DELETE_SERVICE",
      targetType: "SERVICE",
      targetId: id,
      targetName: service.name,
      reason: body.reason,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Service delete error:", error);
    return NextResponse.json({ error: "Failed to delete service" }, { status: 500 });
  }
}
