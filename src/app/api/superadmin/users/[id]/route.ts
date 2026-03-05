import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, createAuditLog } from "@/lib/superadmin-auth";
import { prisma } from "@/lib/prisma";
import {
  sendEmail, accountSuspendedEmail, accountReinstatedEmail,
  premiumGrantedEmail, premiumRevokedEmail, warningIssuedEmail,
} from "@/lib/email";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.response) return authResult.response;
  const { id } = await params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        bookings: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { property: { select: { name: true, slug: true, serviceType: true } } },
        },
        reviews: {
          orderBy: { createdAt: "desc" },
          include: { property: { select: { name: true, slug: true } } },
        },
        properties: {
          select: { id: true, name: true, slug: true, serviceType: true, status: true },
        },
        personalizedOffers: { orderBy: { createdAt: "desc" } },
        warnings: {
          orderBy: { issuedAt: "desc" },
          include: { issuedBy: { select: { name: true } } },
        },
        suspensions: {
          orderBy: { suspendedAt: "desc" },
          include: { suspendedBy: { select: { name: true } } },
        },
        premiumGrants: {
          orderBy: { createdAt: "desc" },
          include: { grantedBy: { select: { name: true } } },
        },
        _count: {
          select: { bookings: true, reviews: true, wishlist: true, cart: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("User detail error:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireSuperAdmin(req);
  if (authResult.response) return authResult.response;
  const { id } = await params;

  try {
    const body = await req.json();
    const { action, reason, ...updateData } = body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Handle special actions
    if (action === "suspend") {
      const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
      await prisma.$transaction([
        prisma.user.update({ where: { id }, data: { isBlocked: true } }),
        prisma.userSuspension.create({
          data: {
            userId: id,
            reason: reason || "No reason provided",
            suspendedById: authResult.admin.id,
            expiresAt,
          },
        }),
      ]);
      await createAuditLog({
        superadminId: authResult.admin.id,
        actionType: "SUSPEND_USER",
        targetType: "USER",
        targetId: id,
        targetName: user.name,
        afterValue: { suspended: true, reason, expiresAt },
        reason: reason || undefined,
      });
      const emailData = accountSuspendedEmail(user.name, reason);
      sendEmail({ to: user.email, ...emailData }).catch(() => {});
      return NextResponse.json({ success: true, message: "User suspended" });
    }

    if (action === "reinstate") {
      await prisma.$transaction([
        prisma.user.update({ where: { id }, data: { isBlocked: false } }),
        prisma.userSuspension.updateMany({
          where: { userId: id, isActive: true },
          data: { isActive: false, reinstatedAt: new Date() },
        }),
      ]);
      await createAuditLog({
        superadminId: authResult.admin.id,
        actionType: "REINSTATE_USER",
        targetType: "USER",
        targetId: id,
        targetName: user.name,
        reason: reason || undefined,
      });
      const emailData = accountReinstatedEmail(user.name);
      sendEmail({ to: user.email, ...emailData }).catch(() => {});
      return NextResponse.json({ success: true, message: "User reinstated" });
    }

    if (action === "warn") {
      const msg = body.warningMessage || reason || "Warning issued by admin";
      await prisma.userWarning.create({
        data: {
          userId: id,
          warningMessage: msg,
          issuedById: authResult.admin.id,
        },
      });
      await createAuditLog({
        superadminId: authResult.admin.id,
        actionType: "WARN_USER",
        targetType: "USER",
        targetId: id,
        targetName: user.name,
        afterValue: { warningMessage: msg },
        reason: reason || undefined,
      });
      const emailData = warningIssuedEmail(user.name, msg);
      sendEmail({ to: user.email, ...emailData }).catch(() => {});
      return NextResponse.json({ success: true, message: "Warning issued" });
    }

    if (action === "grant-premium") {
      if (user.isBlocked) {
        return NextResponse.json({ error: "Cannot grant premium to a suspended user" }, { status: 400 });
      }
      const expiryDate = body.expiryDate ? new Date(body.expiryDate) : null;
      await prisma.$transaction([
        prisma.user.update({
          where: { id },
          data: { isPremium: true, premiumExpiry: expiryDate, subscriptionPlan: "manual" },
        }),
        prisma.premiumGrant.create({
          data: {
            userId: id,
            grantedById: authResult.admin.id,
            grantType: "manual",
            expiryDate,
          },
        }),
      ]);
      await createAuditLog({
        superadminId: authResult.admin.id,
        actionType: "GRANT_PREMIUM",
        targetType: "USER",
        targetId: id,
        targetName: user.name,
        afterValue: { premiumGranted: true, expiryDate },
        reason: reason || undefined,
      });
      const emailData = premiumGrantedEmail(user.name, expiryDate?.toISOString());
      sendEmail({ to: user.email, ...emailData }).catch(() => {});
      return NextResponse.json({ success: true, message: "Premium granted" });
    }

    if (action === "revoke-premium") {
      await prisma.$transaction([
        prisma.user.update({
          where: { id },
          data: { isPremium: false, premiumExpiry: null, subscriptionPlan: null },
        }),
        prisma.premiumGrant.updateMany({
          where: { userId: id, isActive: true },
          data: { isActive: false, revokedAt: new Date() },
        }),
      ]);
      await createAuditLog({
        superadminId: authResult.admin.id,
        actionType: "REVOKE_PREMIUM",
        targetType: "USER",
        targetId: id,
        targetName: user.name,
        reason: reason || undefined,
      });
      const emailData = premiumRevokedEmail(user.name);
      sendEmail({ to: user.email, ...emailData }).catch(() => {});
      return NextResponse.json({ success: true, message: "Premium revoked" });
    }

    if (action === "delete") {
      // Soft delete — mark as blocked and anonymize
      await prisma.user.update({
        where: { id },
        data: { isBlocked: true, name: `[Deleted] ${user.name}` },
      });
      await createAuditLog({
        superadminId: authResult.admin.id,
        actionType: "DELETE_USER",
        targetType: "USER",
        targetId: id,
        targetName: user.name,
        beforeValue: { name: user.name, email: user.email },
        reason: reason || undefined,
      });
      return NextResponse.json({ success: true, message: "User deleted" });
    }

    // General field update
    const allowedFields = ["name", "email", "phone", "role", "gender", "image"];
    const filteredUpdate: any = {};
    for (const key of allowedFields) {
      if (updateData[key] !== undefined) {
        filteredUpdate[key] = updateData[key];
      }
    }

    if (Object.keys(filteredUpdate).length > 0) {
      const beforeValue: any = {};
      for (const key of Object.keys(filteredUpdate)) {
        beforeValue[key] = (user as any)[key];
      }

      await prisma.user.update({ where: { id }, data: filteredUpdate });
      await createAuditLog({
        superadminId: authResult.admin.id,
        actionType: "EDIT_USER",
        targetType: "USER",
        targetId: id,
        targetName: user.name,
        beforeValue,
        afterValue: filteredUpdate,
        reason: reason || undefined,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("User update error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
