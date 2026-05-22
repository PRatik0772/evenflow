import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export interface BadgeTicket {
  attendeeName: string;
  attendeeEmail: string;
  tierName: string;
  qrToken: string;
}

export interface BadgeEvent {
  title: string;
  startAt: string;
  venueName?: string | null;
  virtualUrl?: string | null;
}

async function generateQRDataUrl(token: string): Promise<string> {
  return QRCode.toDataURL(token, {
    margin: 1,
    width: 200,
    color: { dark: "#0d0d0d", light: "#ffffff" },
  });
}

async function drawBadge(
  doc: jsPDF,
  ticket: BadgeTicket,
  event: BadgeEvent,
  qrDataUrl: string,
  x: number,
  y: number,
  W: number,
  H: number,
): Promise<void> {
  const RADIUS = 6;
  const PAD = 8;

  // Card background
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, W, H, RADIUS, RADIUS, "F");

  // Header bar (dark)
  doc.setFillColor(13, 13, 13);
  doc.roundedRect(x, y, W, 28, RADIUS, RADIUS, "F");
  doc.setFillColor(13, 13, 13);
  doc.rect(x, y + 18, W, 10, "F");

  // "EventFlow" brand
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("EventFlow", x + PAD, y + 11);

  // "NAME BADGE" label
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text("NAME BADGE", x + W - PAD, y + 11, { align: "right" });

  // Attendee name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 15, 15);
  const nameY = y + 46;
  doc.text(ticket.attendeeName, x + PAD, nameY, { maxWidth: W - PAD * 2 - 44 });

  // Tier pill
  const tierY = nameY + 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(99, 102, 241);
  doc.setFillColor(238, 242, 255);
  const tierText = ticket.tierName.toUpperCase();
  const tierW = doc.getTextWidth(tierText) + 8;
  doc.roundedRect(x + PAD, tierY, tierW, 8, 2, 2, "F");
  doc.text(tierText, x + PAD + 4, tierY + 5.5);

  // Divider
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.3);
  doc.line(x + PAD, tierY + 13, x + W - PAD, tierY + 13);

  // Event title
  const evY = tierY + 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);
  doc.text(event.title, x + PAD, evY, { maxWidth: W - PAD * 2 - 42 });

  // Date + venue
  const dateStr = new Date(event.startAt).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const venue = event.virtualUrl ? "Online" : (event.venueName ?? "");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(110, 110, 110);
  doc.text(dateStr, x + PAD, evY + 7);
  if (venue) doc.text(venue, x + PAD, evY + 13);

  // QR code (real encoded image)
  const qrSize = 36;
  const qrX = x + W - PAD - qrSize;
  const qrY2 = y + H - PAD - qrSize;

  doc.addImage(qrDataUrl, "PNG", qrX, qrY2, qrSize, qrSize);

  // "Scan at door" caption below QR
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(130, 130, 130);
  doc.text("Scan at door", qrX + qrSize / 2, qrY2 + qrSize + 4, { align: "center" });

  // Email footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(160, 160, 160);
  doc.text(ticket.attendeeEmail, x + PAD, y + H - PAD);

  // Border
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y, W, H, RADIUS, RADIUS, "S");
}

export async function printSingleBadge(ticket: BadgeTicket, event: BadgeEvent): Promise<void> {
  const W = 148;
  const H = 105;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [H, W] });

  const qrDataUrl = await generateQRDataUrl(ticket.qrToken);
  await drawBadge(doc, ticket, event, qrDataUrl, 5, 5, W - 10, H - 10);

  const url = doc.output("bloburl");
  window.open(url, "_blank");
}

export async function printAllBadges(tickets: BadgeTicket[], event: BadgeEvent): Promise<void> {
  if (tickets.length === 0) return;

  const W = 148;
  const H = 105;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [H, W] });

  for (let i = 0; i < tickets.length; i++) {
    if (i > 0) doc.addPage([H, W], "landscape");
    const qrDataUrl = await generateQRDataUrl(tickets[i]!.qrToken);
    await drawBadge(doc, tickets[i]!, event, qrDataUrl, 5, 5, W - 10, H - 10);
  }

  const url = doc.output("bloburl");
  window.open(url, "_blank");
}
