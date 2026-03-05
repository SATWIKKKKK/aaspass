import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_EMAIL || "aaspass001@gmail.com",
    pass: process.env.SMTP_PASSWORD || "",
  },
});

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail({ to, subject, html, replyTo }: SendEmailOptions) {
  try {
    await transporter.sendMail({
      from: `"AasPass" <${process.env.SMTP_EMAIL || "aaspass001@gmail.com"}>`,
      to,
      subject,
      html,
      replyTo: replyTo || process.env.SMTP_EMAIL || "aaspass001@gmail.com",
    });
    return { success: true };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

// ─── Email Templates ─────────────────────────────────

function baseTemplate(content: string) {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 24px 32px;">
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">AasPass</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">Your Student Services Platform</p>
      </div>
      <div style="padding: 32px;">
        ${content}
      </div>
      <div style="background: #f9fafb; padding: 16px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">AasPass &copy; ${new Date().getFullYear()} &middot; KIIT University Road, Bhubaneswar, Odisha</p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #9ca3af;">
          <a href="mailto:aaspass001@gmail.com" style="color: #2563eb; text-decoration: none;">aaspass001@gmail.com</a> &middot; +91 8690861854
        </p>
      </div>
    </div>
  `;
}

export function accountSuspendedEmail(userName: string, reason?: string) {
  return {
    subject: "Account Suspended — AasPass",
    html: baseTemplate(`
      <h2 style="color: #dc2626; margin: 0 0 16px; font-size: 20px;">Account Suspended</h2>
      <p style="color: #374151; line-height: 1.6;">Hi <strong>${userName}</strong>,</p>
      <p style="color: #374151; line-height: 1.6;">
        Your AasPass account has been suspended by the platform administration.
      </p>
      ${reason ? `<div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
        <p style="margin: 0; color: #991b1b; font-size: 14px;"><strong>Reason:</strong> ${reason}</p>
      </div>` : ""}
      <p style="color: #374151; line-height: 1.6;">
        If you believe this is a mistake, please contact support at 
        <a href="mailto:aaspass001@gmail.com" style="color: #2563eb;">aaspass001@gmail.com</a>.
      </p>
    `),
  };
}

export function accountReinstatedEmail(userName: string) {
  return {
    subject: "Account Reinstated — AasPass",
    html: baseTemplate(`
      <h2 style="color: #16a34a; margin: 0 0 16px; font-size: 20px;">Account Reinstated</h2>
      <p style="color: #374151; line-height: 1.6;">Hi <strong>${userName}</strong>,</p>
      <p style="color: #374151; line-height: 1.6;">
        Great news! Your AasPass account has been reinstated. You can now log in and use the platform as usual.
      </p>
      <p style="color: #374151; line-height: 1.6;">
        Welcome back! If you have any questions, feel free to reach out to us.
      </p>
    `),
  };
}

export function premiumGrantedEmail(userName: string, expiryDate?: string | null) {
  return {
    subject: "Premium Granted — AasPass",
    html: baseTemplate(`
      <h2 style="color: #ca8a04; margin: 0 0 16px; font-size: 20px;">🎉 Premium Access Granted!</h2>
      <p style="color: #374151; line-height: 1.6;">Hi <strong>${userName}</strong>,</p>
      <p style="color: #374151; line-height: 1.6;">
        Congratulations! You've been granted <strong>Premium</strong> access on AasPass.
      </p>
      <div style="background: #fefce8; border-left: 4px solid #ca8a04; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
        <p style="margin: 0; color: #854d0e; font-size: 14px;">
          <strong>Validity:</strong> ${expiryDate ? `Until ${new Date(expiryDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}` : "Lifetime"}
        </p>
      </div>
      <p style="color: #374151; line-height: 1.6;">
        Enjoy exclusive features including priority support, advanced search filters, and more!
      </p>
    `),
  };
}

export function premiumRevokedEmail(userName: string) {
  return {
    subject: "Premium Access Revoked — AasPass",
    html: baseTemplate(`
      <h2 style="color: #dc2626; margin: 0 0 16px; font-size: 20px;">Premium Access Revoked</h2>
      <p style="color: #374151; line-height: 1.6;">Hi <strong>${userName}</strong>,</p>
      <p style="color: #374151; line-height: 1.6;">
        Your Premium access on AasPass has been revoked. You've been moved to the free plan.
      </p>
      <p style="color: #374151; line-height: 1.6;">
        If you'd like to re-subscribe, visit your dashboard. For questions, contact us at
        <a href="mailto:aaspass001@gmail.com" style="color: #2563eb;">aaspass001@gmail.com</a>.
      </p>
    `),
  };
}

export function warningIssuedEmail(userName: string, warningMessage: string) {
  return {
    subject: "Warning Issued — AasPass",
    html: baseTemplate(`
      <h2 style="color: #ea580c; margin: 0 0 16px; font-size: 20px;">⚠️ Warning Issued</h2>
      <p style="color: #374151; line-height: 1.6;">Hi <strong>${userName}</strong>,</p>
      <p style="color: #374151; line-height: 1.6;">
        A warning has been issued on your AasPass account by the platform administration.
      </p>
      <div style="background: #fff7ed; border-left: 4px solid #ea580c; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
        <p style="margin: 0; color: #9a3412; font-size: 14px;"><strong>Warning:</strong> ${warningMessage}</p>
      </div>
      <p style="color: #374151; line-height: 1.6;">
        Please review your activity and ensure compliance with our terms of service to avoid further action.
      </p>
    `),
  };
}

export function contactReceivedEmail(name: string) {
  return {
    subject: "We received your message — AasPass",
    html: baseTemplate(`
      <h2 style="color: #2563eb; margin: 0 0 16px; font-size: 20px;">Message Received!</h2>
      <p style="color: #374151; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
      <p style="color: #374151; line-height: 1.6;">
        Thank you for reaching out! We've received your message and will get back to you within 24 hours.
      </p>
      <p style="color: #374151; line-height: 1.6;">
        In the meantime, feel free to browse our services or check our FAQ section.
      </p>
    `),
  };
}

export function contactNotificationEmail(name: string, email: string, subject: string, message: string) {
  return {
    subject: `New Contact: ${subject}`,
    html: baseTemplate(`
      <h2 style="color: #2563eb; margin: 0 0 16px; font-size: 20px;">New Contact Form Submission</h2>
      <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <p style="margin: 0 0 8px; color: #1e40af; font-size: 14px;"><strong>From:</strong> ${name} (${email})</p>
        <p style="margin: 0 0 8px; color: #1e40af; font-size: 14px;"><strong>Subject:</strong> ${subject}</p>
      </div>
      <div style="background: #f9fafb; padding: 16px; border-radius: 8px;">
        <p style="margin: 0; color: #374151; font-size: 14px; white-space: pre-wrap;">${message}</p>
      </div>
      <p style="color: #6b7280; font-size: 13px; margin-top: 16px;">
        Reply directly to this email to respond to the user.
      </p>
    `),
  };
}
