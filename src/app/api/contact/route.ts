import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST /api/contact — handle contact form submission
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, subject, message } = body;

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    // Check if user is authenticated
    const session = await auth();

    // If authenticated, create a notification for the user
    if (session?.user?.id) {
      await prisma.notification.create({
        data: {
          title: `Contact form: ${subject}`,
          message: `Your message has been received. We'll get back to you within 24 hours.\n\nYour message: ${message}`,
          userId: session.user.id,
          link: "/contact",
        },
      });
    }

    // Find admin users and notify them
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    // Create notifications for all admins
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          title: `New Contact Message: ${subject}`,
          message: `From: ${name} (${email})\n\n${message}`,
          userId: admin.id,
        })),
      });
    }

    // Also create a complaint record for tracking (if user is logged in)
    if (session?.user?.id) {
      await prisma.complaint.create({
        data: {
          subject: `[Contact] ${subject}`,
          description: `Name: ${name}\nEmail: ${email}\n\n${message}`,
          studentId: session.user.id,
          status: "OPEN",
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Your message has been sent successfully. We'll get back to you within 24 hours.",
    });
  } catch (error) {
    console.error("POST /api/contact error:", error);
    return NextResponse.json({ error: "Failed to send message. Please try again." }, { status: 500 });
  }
}
