import { jsPDF } from "jspdf";

interface InvoiceTicket {
  attendeeName: string;
  tierName: string;
  priceCents: number;
}

interface InvoiceEvent {
  title: string;
  startAt: string | Date;
  venueName?: string | null;
  venueAddress?: string | null;
  virtualUrl?: string | null;
}

export interface InvoiceOrder {
  id: string;
  createdAt: string | Date;
  buyerName?: string;
  buyerEmail?: string;
  totalCents: number;
  event?: InvoiceEvent | null;
  tickets: InvoiceTicket[];
}

export function generateInvoicePDF(order: InvoiceOrder): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const PAGE_W = 210;
  const MARGIN = 22;
  const COL_R = PAGE_W - MARGIN;

  // ── Header bar ──
  doc.setFillColor(13, 13, 13);
  doc.rect(0, 0, PAGE_W, 30, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(255, 255, 255);
  doc.text("EventFlow", MARGIN, 20);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(160, 160, 160);
  doc.text("TAX INVOICE", COL_R, 20, { align: "right" });

  // ── Invoice metadata (right column) ──
  let y = 46;
  const metaLabelX = COL_R - 38;

  function metaRow(label: string, value: string, highlight?: boolean) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(140, 140, 140);
    doc.text(label, metaLabelX, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    if (highlight) {
      doc.setTextColor(21, 128, 61);
    } else {
      doc.setTextColor(20, 20, 20);
    }
    doc.text(value, COL_R, y, { align: "right" });
    y += 7;
  }

  const ySnapshot = y;
  metaRow("Invoice No.", `ORD-${order.id.slice(-8).toUpperCase()}`);
  metaRow(
    "Issued",
    new Date(order.createdAt).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  );
  metaRow("Status", "PAID", true);

  // ── Billed To (left column, same y start) ──
  y = ySnapshot;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(140, 140, 140);
  doc.text("BILLED TO", MARGIN, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(13, 13, 13);
  doc.text(order.buyerName ?? "Customer", MARGIN, y);
  y += 6;

  if (order.buyerEmail) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(order.buyerEmail, MARGIN, y);
    y += 5;
  }

  // ── Event block ──
  if (order.event) {
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.text("EVENT", MARGIN, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(13, 13, 13);
    doc.text(order.event.title, MARGIN, y, { maxWidth: 110 });
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 100, 100);

    const dateStr = new Date(order.event.startAt).toLocaleString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    doc.text(dateStr, MARGIN, y);
    y += 5;

    if (order.event.virtualUrl) {
      doc.text("Online Event", MARGIN, y);
    } else {
      const loc = [order.event.venueName, order.event.venueAddress]
        .filter(Boolean)
        .join(", ");
      if (loc) doc.text(loc, MARGIN, y, { maxWidth: 110 });
    }
  }

  // ── Table ──
  y = Math.max(y + 16, 100);

  // Header rule
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, COL_R, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(140, 140, 140);
  doc.text("TICKET TYPE", MARGIN, y);
  doc.text("ATTENDEE", MARGIN + 62, y);
  doc.text("PRICE", COL_R, y, { align: "right" });

  y += 4;
  doc.setDrawColor(220, 220, 220);
  doc.line(MARGIN, y, COL_R, y);
  y += 7;

  // Rows
  for (const ticket of order.tickets) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(13, 13, 13);

    doc.text(ticket.tierName, MARGIN, y, { maxWidth: 58 });
    doc.text(ticket.attendeeName, MARGIN + 62, y, { maxWidth: 62 });

    const price =
      ticket.priceCents === 0 ? "Free" : `$${(ticket.priceCents / 100).toFixed(2)} AUD`;
    doc.text(price, COL_R, y, { align: "right" });

    y += 9;
  }

  y += 4;
  doc.setDrawColor(220, 220, 220);
  doc.line(MARGIN, y, COL_R, y);
  y += 10;

  // Total row
  const totalStr =
    order.totalCents === 0 ? "Free" : `$${(order.totalCents / 100).toFixed(2)} AUD`;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(140, 140, 140);
  doc.text("TOTAL PAID", MARGIN, y);

  doc.setFontSize(15);
  doc.setTextColor(13, 13, 13);
  doc.text(totalStr, COL_R, y, { align: "right" });

  // ── Footer ──
  const PAGE_H = 297;
  doc.setDrawColor(220, 220, 220);
  doc.line(MARGIN, PAGE_H - 22, COL_R, PAGE_H - 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(160, 160, 160);
  doc.text(
    "Powered by EventFlow — Event ticketing for Australia",
    PAGE_W / 2,
    PAGE_H - 15,
    { align: "center" },
  );
  doc.text(
    "This document serves as a tax invoice for GST purposes.",
    PAGE_W / 2,
    PAGE_H - 10,
    { align: "center" },
  );

  doc.save(`invoice-ORD-${order.id.slice(-8).toUpperCase()}.pdf`);
}
