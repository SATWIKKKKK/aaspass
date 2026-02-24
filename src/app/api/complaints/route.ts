import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/complaints
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const where: any = {};
    const role = (session.user as any)?.role;
    if (role === "STUDENT") {
      where.studentId = session.user.id;
    } else if (role === "OWNER") {
      // Filter by properties owned by this user (ownerId on complaint is rarely set)
      where.property = { ownerId: session.user.id };
    }

    const complaints = await prisma.complaint.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        property: { select: { name: true } },
        student: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json({ complaints });
  } catch (error) {
    console.error("GET /api/complaints error:", error);
    return NextResponse.json({ error: "Failed to fetch complaints" }, { status: 500 });
  }
}

// POST /api/complaints
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { propertyId, subject, description } = await req.json();

    if (!propertyId || !subject || !description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const complaint = await prisma.complaint.create({
      data: {
        studentId: session.user.id!,
        propertyId,
        subject,
        description,
        status: "OPEN",
      },
    });

    // Notify property owner
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (property) {
      await prisma.notification.create({
        data: {
          userId: property.ownerId,
          title: "New Complaint",
          message: `Complaint: ${subject}`,
        },
      });
    }

    return NextResponse.json({ complaint }, { status: 201 });
  } catch (error) {
    console.error("POST /api/complaints error:", error);
    return NextResponse.json({ error: "Failed to create complaint" }, { status: 500 });
  }
}
