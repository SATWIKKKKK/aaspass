import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET /api/profile
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id! },
      select: {
        id: true, name: true, email: true, phone: true, image: true,
        role: true, gender: true, aadharNo: true, isPremium: true, superCoins: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("GET /api/profile error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

// PATCH /api/profile — update profile
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, phone, gender, aadharNo, image, currentPassword, newPassword } = await req.json();

    const updateData: any = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (gender) updateData.gender = gender;
    if (aadharNo) updateData.aadharNo = aadharNo;
    if (image) updateData.image = image;

    // Password change
    if (currentPassword && newPassword) {
      const user = await prisma.user.findUnique({ where: { id: session.user.id! } });
      if (!user?.password) return NextResponse.json({ error: "Cannot change password" }, { status: 400 });
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      updateData.password = await bcrypt.hash(newPassword, 12);
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id! },
      data: updateData,
      select: { id: true, name: true, email: true, phone: true, image: true, role: true, gender: true },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("PATCH /api/profile error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
