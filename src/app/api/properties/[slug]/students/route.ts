import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/properties/[slug]/students — list students for this service
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const property = await prisma.property.findUnique({
      where: { slug },
      select: { id: true, ownerId: true },
    });
    if (!property || property.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    const students = await prisma.serviceStudent.findMany({
      where: { propertyId: property.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ students });
  } catch (error) {
    console.error("GET /api/properties/[slug]/students error:", error);
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}

// POST /api/properties/[slug]/students — add students (single or bulk)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const property = await prisma.property.findUnique({
      where: { slug },
      select: { id: true, ownerId: true },
    });
    if (!property || property.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    const body = await req.json();
    const { students } = body; // Array of { name, email?, phone? }

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: "No students provided" }, { status: 400 });
    }

    let added = 0;
    let linked = 0;
    let skipped = 0;
    const results: any[] = [];

    for (const s of students) {
      if (!s.name || (!s.email && !s.phone)) {
        skipped++;
        continue;
      }

      // Check for duplicate in service_students
      const existing = await prisma.serviceStudent.findFirst({
        where: {
          propertyId: property.id,
          OR: [
            ...(s.email ? [{ email: s.email.toLowerCase() }] : []),
            ...(s.phone ? [{ phone: s.phone }] : []),
          ],
        },
      });
      if (existing) {
        skipped++;
        continue;
      }

      // Check if a user account exists
      let matchedUser = null;
      if (s.email) {
        matchedUser = await prisma.user.findUnique({ where: { email: s.email.toLowerCase() } });
      }
      if (!matchedUser && s.phone) {
        matchedUser = await prisma.user.findUnique({ where: { phone: s.phone } });
      }

      const serviceStudent = await prisma.serviceStudent.create({
        data: {
          propertyId: property.id,
          name: s.name,
          email: s.email ? s.email.toLowerCase() : null,
          phone: s.phone || null,
          userId: matchedUser?.id || null,
          isVerified: !!matchedUser,
        },
      });

      results.push(serviceStudent);
      added++;
      if (matchedUser) linked++;

      // Send notification to linked user
      if (matchedUser) {
        await prisma.notification.create({
          data: {
            userId: matchedUser.id,
            title: "You've been added to a service",
            message: `The owner has added you as a verified user of their service. You can now leave reviews.`,
            type: "announcement",
            link: `/services/${slug}`,
          },
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      added,
      linked,
      skipped,
      total: students.length,
      students: results,
    });
  } catch (error) {
    console.error("POST /api/properties/[slug]/students error:", error);
    return NextResponse.json({ error: "Failed to add students" }, { status: 500 });
  }
}

// DELETE /api/properties/[slug]/students — remove a student
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("id");
    if (!studentId) {
      return NextResponse.json({ error: "Student ID required" }, { status: 400 });
    }

    const property = await prisma.property.findUnique({
      where: { slug },
      select: { id: true, ownerId: true },
    });
    if (!property || property.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    await prisma.serviceStudent.delete({
      where: { id: studentId, propertyId: property.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/properties/[slug]/students error:", error);
    return NextResponse.json({ error: "Failed to remove student" }, { status: 500 });
  }
}
