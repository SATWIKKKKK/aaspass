import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/properties/[slug]/students/check — check if current user is a service student
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ isServiceStudent: false });
    }

    const { slug } = await params;
    const property = await prisma.property.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!property) {
      return NextResponse.json({ isServiceStudent: false });
    }

    const serviceStudent = await prisma.serviceStudent.findFirst({
      where: { propertyId: property.id, userId: session.user.id! },
    });

    return NextResponse.json({ isServiceStudent: !!serviceStudent });
  } catch (error) {
    console.error("GET /api/properties/[slug]/students/check error:", error);
    return NextResponse.json({ isServiceStudent: false });
  }
}
