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
    const filter = url.searchParams.get("filter") || ""; // active, expired, used
    const search = url.searchParams.get("search") || "";

    const where: any = {};
    if (filter === "active") { where.isActive = true; where.expiryDate = { gt: new Date() }; }
    else if (filter === "expired") { where.expiryDate = { lt: new Date() }; }
    else if (filter === "used") { where.isUsed = true; }
    else if (filter === "revoked") { where.revokedAt = { not: null }; }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { assignedTo: { name: { contains: search, mode: "insensitive" } } },
        { assignedTo: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [offers, total] = await Promise.all([
      prisma.personalizedOffer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.personalizedOffer.count({ where }),
    ]);

    return NextResponse.json({
      offers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Offers list error:", error);
    return NextResponse.json({ error: "Failed to fetch offers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.response) return authResult.response;

  try {
    const body = await req.json();
    const { assignedToUserId, title, description, discountType, discountValue, applicableServiceTypes, startDate, expiryDate, isStackable } = body;

    if (!assignedToUserId || !title || !discountType || !discountValue || !expiryDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: assignedToUserId }, select: { id: true, name: true } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const offer = await prisma.personalizedOffer.create({
      data: {
        assignedToUserId,
        title,
        description: description || "",
        discountType,
        discountValue,
        applicableServiceTypes: applicableServiceTypes || [],
        startDate: startDate ? new Date(startDate) : new Date(),
        expiryDate: new Date(expiryDate),
        isStackable: isStackable || false,
      },
    });

    await createAuditLog({
      superadminId: authResult.admin.id,
      actionType: "CREATE_OFFER",
      targetType: "OFFER",
      targetId: offer.id,
      targetName: title,
      afterValue: { assignedToUserId, title, discountType, discountValue, expiryDate },
    });

    return NextResponse.json({ success: true, offer });
  } catch (error) {
    console.error("Create offer error:", error);
    return NextResponse.json({ error: "Failed to create offer" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.response) return authResult.response;

  try {
    const { offerId, action, reason, ...updateData } = await req.json();

    const offer = await prisma.personalizedOffer.findUnique({ where: { id: offerId } });
    if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 });

    if (action === "revoke") {
      await prisma.personalizedOffer.update({
        where: { id: offerId },
        data: { isActive: false, revokedAt: new Date() },
      });
      await createAuditLog({
        superadminId: authResult.admin.id,
        actionType: "REVOKE_OFFER",
        targetType: "OFFER",
        targetId: offerId,
        targetName: offer.title,
        reason,
      });
      return NextResponse.json({ success: true, message: "Offer revoked" });
    }

    // Edit offer fields
    const allowedFields = ["title", "description", "discountType", "discountValue", "expiryDate", "isStackable", "isActive"];
    const filteredUpdate: any = {};
    for (const key of allowedFields) {
      if (updateData[key] !== undefined) {
        filteredUpdate[key] = key === "expiryDate" ? new Date(updateData[key]) : updateData[key];
      }
    }

    if (Object.keys(filteredUpdate).length > 0) {
      await prisma.personalizedOffer.update({ where: { id: offerId }, data: filteredUpdate });
      await createAuditLog({
        superadminId: authResult.admin.id,
        actionType: "EDIT_OFFER",
        targetType: "OFFER",
        targetId: offerId,
        targetName: offer.title,
        beforeValue: offer,
        afterValue: filteredUpdate,
        reason,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update offer error:", error);
    return NextResponse.json({ error: "Failed to update offer" }, { status: 500 });
  }
}
