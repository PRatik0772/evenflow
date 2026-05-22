// Replit Connectors SDK — handles auth to Resend automatically
import { ReplitConnectors } from "@replit/connectors-sdk";

const FROM = process.env["EMAIL_FROM"] ?? "EventFlow <onboarding@resend.dev>";
const APP_URL = (() => {
  const d = process.env["REPLIT_DOMAINS"]?.split(",")[0];
  return d ? `https://${d}` : `http://localhost:${process.env["PORT"] ?? 5000}`;
})();

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  try {
    const connectors = new ReplitConnectors();
    const res = await connectors.proxy("resend", "/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[EMAIL] Failed to send to ${to}: ${res.status} ${body}`);
    }
  } catch (err) {
    console.error(`[EMAIL] Error sending to ${to}:`, err);
  }
}

function base(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EventFlow</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <tr><td style="background:#0d0d0d;padding:24px 32px;">
        <span style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">EventFlow</span>
      </td></tr>
      <tr><td style="padding:32px;">${content}</td></tr>
      <tr><td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #f3f4f6;">
        <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
          You're receiving this because you purchased or registered for an event on EventFlow.<br>
          EventFlow · Australia
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

export function orderConfirmationEmail(params: {
  buyerName: string;
  eventTitle: string;
  eventStartAt: string;
  eventVenue: string | null;
  eventVirtualUrl: string | null;
  orderId: string;
  totalCents: number;
  tickets: Array<{ attendeeName: string; tierName: string; qrToken: string; priceCents: number }>;
}): string {
  const { buyerName, eventTitle, eventStartAt, eventVenue, eventVirtualUrl, orderId, totalCents, tickets } = params;
  const date = new Date(eventStartAt).toLocaleDateString("en-AU", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const time = new Date(eventStartAt).toLocaleTimeString("en-AU", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });
  const location = eventVirtualUrl ? "Online Event" : (eventVenue ?? "Venue TBA");
  const orderRef = orderId.slice(-8).toUpperCase();
  const total = totalCents === 0 ? "Free" : `A$${(totalCents / 100).toFixed(2)}`;

  const ticketBlocks = tickets.map(t => `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;margin-bottom:12px;overflow:hidden;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 2px 0;font-size:14px;font-weight:700;color:#111827;">${t.attendeeName}</p>
          <p style="margin:0;font-size:12px;color:#6b7280;">${t.tierName}${t.priceCents > 0 ? ` · A$${(t.priceCents / 100).toFixed(2)}` : " · Free"}</p>
        </td>
        <td style="padding:16px 20px;text-align:right;vertical-align:middle;">
          <a href="${APP_URL}/tickets/${t.qrToken}" style="display:inline-block;background:#0d0d0d;color:#ffffff;font-size:12px;font-weight:600;padding:8px 16px;border-radius:100px;text-decoration:none;">View Ticket</a>
        </td>
      </tr>
    </table>`).join("");

  return base(`
    <div style="margin-bottom:24px;">
      <div style="display:inline-block;background:#ecfdf5;color:#065f46;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;padding:4px 12px;border-radius:100px;margin-bottom:16px;">Booking Confirmed</div>
      <h1 style="margin:0 0 8px 0;font-size:26px;font-weight:800;color:#111827;letter-spacing:-0.5px;">You're going,&nbsp;${buyerName.split(" ")[0]}!</h1>
      <p style="margin:0;font-size:15px;color:#6b7280;">Here are your tickets for <strong>${eventTitle}</strong>.</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 4px 0;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Event</p>
          <p style="margin:0 0 12px 0;font-size:16px;font-weight:700;color:#111827;">${eventTitle}</p>
          <p style="margin:0 0 4px 0;font-size:13px;color:#374151;">${date} at ${time}</p>
          <p style="margin:0;font-size:13px;color:#374151;">${location}</p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 12px 0;font-size:12px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Your Tickets</p>
    ${ticketBlocks}

    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f3f4f6;margin-top:20px;padding-top:20px;">
      <tr>
        <td style="padding-top:16px;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">Order <strong style="color:#6b7280;">#${orderRef}</strong> · Total: <strong style="color:#111827;">${total}</strong></p>
        </td>
      </tr>
    </table>

    <p style="margin:24px 0 0 0;font-size:13px;color:#6b7280;">Tap "View Ticket" above to open your QR code — screenshot it or show it at the door.</p>
  `);
}

export function cancellationEmail(params: {
  attendeeName: string;
  eventTitle: string;
  eventStartAt: string;
}): string {
  const { attendeeName, eventTitle, eventStartAt } = params;
  const date = new Date(eventStartAt).toLocaleDateString("en-AU", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  return base(`
    <div style="margin-bottom:24px;">
      <div style="display:inline-block;background:#fef2f2;color:#991b1b;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;padding:4px 12px;border-radius:100px;margin-bottom:16px;">Event Cancelled</div>
      <h1 style="margin:0 0 8px 0;font-size:26px;font-weight:800;color:#111827;letter-spacing:-0.5px;">We're sorry, ${attendeeName.split(" ")[0]}</h1>
      <p style="margin:0;font-size:15px;color:#6b7280;">Unfortunately, <strong>${eventTitle}</strong> scheduled for ${date} has been cancelled by the organiser.</p>
    </div>
    <p style="font-size:14px;color:#374151;line-height:1.6;">If you paid for your ticket, please contact the event organiser directly to arrange a refund. We're sorry for any inconvenience.</p>
    <div style="margin-top:24px;">
      <a href="${APP_URL}/" style="display:inline-block;background:#0d0d0d;color:#ffffff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:100px;text-decoration:none;">Browse Other Events</a>
    </div>
  `);
}

export function eventReminderEmail(params: {
  attendeeName: string;
  eventTitle: string;
  eventStartAt: string;
  eventVenue: string | null;
  eventVirtualUrl: string | null;
  ticketUrl: string;
  reminderType: "7day" | "1day" | "1hour";
}): string {
  const { attendeeName, eventTitle, eventStartAt, eventVenue, eventVirtualUrl, ticketUrl, reminderType } = params;
  const date = new Date(eventStartAt).toLocaleDateString("en-AU", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const time = new Date(eventStartAt).toLocaleTimeString("en-AU", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });
  const location = eventVirtualUrl ? `<a href="${eventVirtualUrl}" style="color:#6366f1;">${eventVirtualUrl}</a>` : (eventVenue ?? "Venue TBA");
  const headings: Record<string, string> = {
    "7day": "Your event is 1 week away",
    "1day": "Your event is tomorrow",
    "1hour": "Your event starts in 1 hour!",
  };
  return base(`
    <div style="margin-bottom:24px;">
      <div style="display:inline-block;background:#eff6ff;color:#1d4ed8;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;padding:4px 12px;border-radius:100px;margin-bottom:16px;">Event Reminder</div>
      <h1 style="margin:0 0 8px 0;font-size:26px;font-weight:800;color:#111827;letter-spacing:-0.5px;">${headings[reminderType]}</h1>
      <p style="margin:0;font-size:15px;color:#6b7280;">Hi ${attendeeName.split(" ")[0]}, don't forget about <strong>${eventTitle}</strong>!</p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 4px 0;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">When</p>
          <p style="margin:0 0 12px 0;font-size:16px;font-weight:700;color:#111827;">${date} at ${time}</p>
          <p style="margin:0 0 4px 0;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Where</p>
          <p style="margin:0;font-size:14px;color:#374151;">${location}</p>
        </td>
      </tr>
    </table>
    <div style="margin-top:24px;">
      <a href="${ticketUrl}" style="display:inline-block;background:#0d0d0d;color:#ffffff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:100px;text-decoration:none;">View My Ticket</a>
    </div>
  `);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function announcementEmail(params: {
  eventTitle: string;
  subject: string;
  body: string;
}): string {
  const { eventTitle, subject, body } = params;
  const safeSubject = escapeHtml(subject);
  const safeEventTitle = escapeHtml(eventTitle);
  const safeBody = escapeHtml(body).replace(/\n/g, "<br>");
  return base(`
    <div style="margin-bottom:24px;">
      <div style="display:inline-block;background:#eff6ff;color:#1d4ed8;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;padding:4px 12px;border-radius:100px;margin-bottom:16px;">Event Update</div>
      <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:800;color:#111827;letter-spacing:-0.5px;">${safeSubject}</h1>
      <p style="margin:0;font-size:13px;color:#9ca3af;">From the organiser of <strong>${safeEventTitle}</strong></p>
    </div>
    <div style="font-size:15px;color:#374151;line-height:1.7;">${safeBody}</div>
    <div style="margin-top:28px;padding-top:20px;border-top:1px solid #f3f4f6;">
      <a href="${APP_URL}/" style="display:inline-block;background:#0d0d0d;color:#ffffff;font-size:13px;font-weight:600;padding:10px 22px;border-radius:100px;text-decoration:none;">Browse Events</a>
    </div>
  `);
}

export function passwordResetEmail(params: { name: string; resetUrl: string }): string {
  const { name, resetUrl } = params;
  return base(`
    <div style="margin-bottom:24px;">
      <h1 style="margin:0 0 8px 0;font-size:26px;font-weight:800;color:#111827;letter-spacing:-0.5px;">Reset your password</h1>
      <p style="margin:0;font-size:15px;color:#6b7280;">Hi ${name.split(" ")[0]}, we received a request to reset your EventFlow password.</p>
    </div>
    <p style="font-size:14px;color:#374151;line-height:1.6;">Click the button below to choose a new password. This link expires in 60 minutes.</p>
    <div style="margin:28px 0;">
      <a href="${resetUrl}" style="display:inline-block;background:#0d0d0d;color:#ffffff;font-size:14px;font-weight:600;padding:14px 28px;border-radius:100px;text-decoration:none;">Set New Password</a>
    </div>
    <p style="font-size:13px;color:#9ca3af;">If you didn't request this, you can safely ignore this email — your password won't change.</p>
  `);
}
