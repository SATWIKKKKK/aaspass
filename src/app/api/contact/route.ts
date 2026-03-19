import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendEmail, contactNotificationEmail, contactReceivedEmail } from "@/lib/email";

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

    // Send both emails and surface an API failure only if both deliveries fail.
    const notifEmail = contactNotificationEmail(name, email, subject, message);
    const supportInbox = process.env.CONTACT_EMAIL || process.env.SMTP_EMAIL || "support@aaspass.com";
    const confirmEmail = contactReceivedEmail(name);

    const [supportSendResult, confirmSendResult] = await Promise.all([
      sendEmail({
        to: supportInbox,
        subject: notifEmail.subject,
        html: notifEmail.html,
        replyTo: email,
      }),
      sendEmail({
        to: email,
        subject: confirmEmail.subject,
        html: confirmEmail.html,
      }),
    ]);

    const supportFailed = !supportSendResult?.success;
    const confirmFailed = !confirmSendResult?.success;

    if (supportFailed && confirmFailed) {
      console.error("Both contact emails failed", {
        supportError: supportSendResult?.error,
        confirmError: confirmSendResult?.error,
      });
      return NextResponse.json(
        { error: "Failed to send message emails. Please try again shortly." },
        { status: 502 },
      );
    }

    if (supportFailed || confirmFailed) {
      console.warn("Partial contact email delivery", {
        supportFailed,
        confirmFailed,
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
