import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { prisma } from "@/lib/prisma";
import { createAccountBySuperAdmin, SuperAdminCreationError } from "@/lib/superadmin-creation";

export async function GET(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.response) return authResult.response;

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
    const search = url.searchParams.get("search") || "";
    const role = url.searchParams.get("role") || "";
    const plan = url.searchParams.get("plan") || "";
    const status = url.searchParams.get("status") || "";
    const city = url.searchParams.get("city") || "";
    const sortBy = url.searchParams.get("sortBy") || "createdAt";
    const sortOrder = url.searchParams.get("sortOrder") || "desc";

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    if (role === "STUDENT" || role === "OWNER") {
      where.role = role;
    }

    if (plan === "premium") {
      where.isPremium = true;
    } else if (plan === "free") {
      where.isPremium = false;
    }

    if (status === "active") {
      where.isBlocked = false;
    } else if (status === "suspended") {
      where.isBlocked = true;
    }

    const orderBy: any = {};
    if (sortBy === "name") orderBy.name = sortOrder;
    else if (sortBy === "lastActive") orderBy.updatedAt = sortOrder;
    else orderBy.createdAt = sortOrder;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isPremium: true,
          isBlocked: true,
          image: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { bookings: true, reviews: true, properties: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Users list error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.response) return authResult.response;

  try {
    const body = await req.json();
    const result = await createAccountBySuperAdmin(body, authResult.admin.id);

    return NextResponse.json({
      success: true,
      user: result.user,
      generatedPassword: result.generatedPassword,
      generatedEmail: result.generatedEmail,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof SuperAdminCreationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("User create error:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
