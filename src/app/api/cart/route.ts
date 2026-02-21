import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/cart
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const items = await prisma.cartItem.findMany({
      where: { userId: session.user.id! },
      include: {
        property: {
          select: { id: true, name: true, slug: true, price: true, gstRate: true, city: true, serviceType: true, images: { take: 1 } },
        },
      },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("GET /api/cart error:", error);
    return NextResponse.json({ error: "Failed to fetch cart" }, { status: 500 });
  }
}

// POST /api/cart — add item
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { propertyId, checkIn, checkOut } = await req.json();

    const existing = await prisma.cartItem.findFirst({
      where: { userId: session.user.id!, propertyId },
    });
    if (existing) return NextResponse.json({ error: "Already in cart" }, { status: 409 });

    const item = await prisma.cartItem.create({
      data: {
        userId: session.user.id!,
        propertyId,
        checkIn: checkIn ? new Date(checkIn) : new Date(),
        checkOut: checkOut ? new Date(checkOut) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("POST /api/cart error:", error);
    return NextResponse.json({ error: "Failed to add to cart" }, { status: 500 });
  }
}

// DELETE /api/cart
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("id");

    if (itemId) {
      await prisma.cartItem.deleteMany({ where: { id: itemId, userId: session.user.id! } });
    } else {
      await prisma.cartItem.deleteMany({ where: { userId: session.user.id! } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/cart error:", error);
    return NextResponse.json({ error: "Failed to remove from cart" }, { status: 500 });
  }
}
