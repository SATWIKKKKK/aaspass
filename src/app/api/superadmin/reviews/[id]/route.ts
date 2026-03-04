import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, createAuditLog } from "@/lib/superadmin-auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.response) return authResult.response;
  const { id } = await params;

  try {
    const review = await prisma.review.findUnique({
      where: { id },
      include: { user: { select: { name: true } }, property: { select: { name: true, id: true, totalReviews: true, avgRating: true } } },
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));

    await prisma.review.delete({ where: { id } });

    // Update property review count and average
    const remaining = await prisma.review.aggregate({
      where: { propertyId: review.propertyId },
      _avg: { rating: true },
      _count: { _all: true },
    });

    await prisma.property.update({
      where: { id: review.propertyId },
      data: {
        avgRating: remaining._avg.rating || 0,
        totalReviews: remaining._count._all,
      },
    });

    await createAuditLog({
      superadminId: authResult.admin.id,
      actionType: "DELETE_REVIEW",
      targetType: "REVIEW",
      targetId: id,
      targetName: `Review by ${review.user.name} on ${review.property.name}`,
      beforeValue: { rating: review.rating, comment: review.comment },
      reason: (body as any).reason,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete review error:", error);
    return NextResponse.json({ error: "Failed to delete review" }, { status: 500 });
  }
}
