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
      select: { id: true, ownerId: true, availableRooms: true, capacity: true },
    });
    if (!property || property.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    const body = await req.json();
    const { students } = body; // Array of { name, email?, phone?, seatNumber? }

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
          seatNumber: s.seatNumber || null,
          status: "ACTIVE",
        },
      });

      results.push(serviceStudent);
      added++;
      if (matchedUser) linked++;

      // Auto-decrement available seats
      if (property.capacity && property.availableRooms !== null && property.availableRooms > 0) {
        property.availableRooms = Math.max(0, property.availableRooms - 1);
        await prisma.property.update({
          where: { id: property.id },
          data: { availableRooms: property.availableRooms },
        });
      }

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

// DELETE /api/properties/[slug]/students — remove a student (auto-frees seat)
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
      select: { id: true, ownerId: true, availableRooms: true, capacity: true },
    });
    if (!property || property.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    // Check if student was ACTIVE before deleting (to free up seat)
    const student = await prisma.serviceStudent.findUnique({
      where: { id: studentId, propertyId: property.id },
    });

    await prisma.serviceStudent.delete({
      where: { id: studentId, propertyId: property.id },
    });

    // Auto-increment available seats if student was active and capacity is tracked
    if (student?.status === "ACTIVE" && property.capacity && property.availableRooms !== null) {
      const newAvailable = Math.min(property.capacity, (property.availableRooms || 0) + 1);
      await prisma.property.update({
        where: { id: property.id },
        data: { availableRooms: newAvailable },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/properties/[slug]/students error:", error);
    return NextResponse.json({ error: "Failed to remove student" }, { status: 500 });
  }
}

// PATCH /api/properties/[slug]/students — update student status (ACTIVE/INACTIVE/LEFT)
export async function PATCH(
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
      select: { id: true, ownerId: true, availableRooms: true, capacity: true },
    });
    if (!property || property.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    const body = await req.json();
    const { studentId, status, seatNumber } = body;

    if (!studentId) {
      return NextResponse.json({ error: "Student ID required" }, { status: 400 });
    }

    const student = await prisma.serviceStudent.findUnique({
      where: { id: studentId, propertyId: property.id },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (seatNumber !== undefined) updateData.seatNumber = seatNumber;

    const updated = await prisma.serviceStudent.update({
      where: { id: studentId },
      data: updateData,
    });

    // Auto-update seat count when status changes
    if (status && status !== student.status && property.capacity && property.availableRooms !== null) {
      const wasActive = student.status === "ACTIVE";
      const isNowActive = status === "ACTIVE";

      if (wasActive && !isNowActive) {
        // Student left/inactive → free up a seat
        const newAvailable = Math.min(property.capacity, (property.availableRooms || 0) + 1);
        await prisma.property.update({
          where: { id: property.id },
          data: { availableRooms: newAvailable },
        });
      } else if (!wasActive && isNowActive) {
        // Student re-activated → occupy a seat
        const newAvailable = Math.max(0, (property.availableRooms || 0) - 1);
        await prisma.property.update({
          where: { id: property.id },
          data: { availableRooms: newAvailable },
        });
      }
    }

    return NextResponse.json({ student: updated });
  } catch (error) {
    console.error("PATCH /api/properties/[slug]/students error:", error);
    return NextResponse.json({ error: "Failed to update student" }, { status: 500 });
  }
}
