import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import { useGetTicket, getGetTicketQueryKey } from "@workspace/api-client-react";
import QRCode from "qrcode";
import { format } from "date-fns";
import { ArrowLeft, MapPin, Calendar, CheckCircle2, AlertCircle, Clock, Download, Loader2 } from "lucide-react";
import { VenueMap } from "@/components/VenueMap";
import { useToast } from "@/hooks/use-toast";

export default function TicketView() {
  const params = useParams<{ qrToken: string }>();
  const qrToken = params.qrToken || "";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isWalletLoading, setIsWalletLoading] = useState(false);

  const { data: ticket, isLoading, error } = useGetTicket(qrToken, {
    query: { queryKey: getGetTicketQueryKey(qrToken), enabled: !!qrToken }
  });

  useEffect(() => {
    if (!ticket?.qrToken || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, ticket.qrToken, {
      width: 260,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    });
  }, [ticket?.qrToken]);

  async function downloadPDF() {
    if (!ticket) return;
    setIsPdfLoading(true);
    try {
      const { jsPDF } = await import("jspdf");

      const W = 90;   // mm
      const MARGIN = 6;
      const CENTER = W / 2;

      // Page height: header(28) + event info(~38) + separator(8) + qr(72) + scan label(10) + info grid(~54) + footer(14)
      const H = 230;

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [W, H] });

      // ── Black header ──
      doc.setFillColor(13, 13, 13);
      doc.rect(0, 0, W, 26, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text("EventFlow", MARGIN, 11);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(150, 150, 150);
      doc.text("EVENT TICKET", W - MARGIN, 11, { align: "right" });

      // Event title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(13, 13, 13);
      const title = ticket.event?.title ?? "Event Ticket";
      const titleLines = doc.splitTextToSize(title, W - MARGIN * 2) as string[];
      doc.text(titleLines, MARGIN, 33);

      let y = 33 + titleLines.length * 6;

      // Event date + venue
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 100, 100);
      if (ticket.event?.startAt) {
        const d = new Date(ticket.event.startAt);
        doc.text(
          `${d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}  ${d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true })}`,
          MARGIN, y,
        );
        y += 6;
      }
      const loc = ticket.event?.virtualUrl
        ? "Online Event"
        : [ticket.event?.venueName, ticket.event?.venueAddress].filter(Boolean).join(", ");
      if (loc) {
        doc.text(loc, MARGIN, y, { maxWidth: W - MARGIN * 2 });
        y += 6;
      }

      // ── Dashed separator ──
      y += 4;
      doc.setDrawColor(220, 220, 220);
      doc.setLineDashPattern([1.5, 1.5], 0);
      doc.setLineWidth(0.4);
      doc.line(MARGIN, y, W - MARGIN, y);
      doc.setLineDashPattern([], 0);
      y += 6;

      // ── QR code from canvas ──
      const qrSize = 58;
      const qrX = (W - qrSize) / 2;

      if (canvasRef.current) {
        const qrDataUrl = canvasRef.current.toDataURL("image/png");
        doc.addImage(qrDataUrl, "PNG", qrX, y, qrSize, qrSize);
      }
      y += qrSize + 4;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.setTextColor(160, 160, 160);
      doc.text("SCAN AT ENTRANCE", CENTER, y, { align: "center" });
      y += 8;

      // ── Info grid ──
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.3);
      doc.line(MARGIN, y, W - MARGIN, y);
      y += 5;

      function infoCell(label: string, value: string, x: number, cellY: number, maxWidth: number) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5.5);
        doc.setTextColor(150, 150, 150);
        doc.text(label.toUpperCase(), x, cellY);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(13, 13, 13);
        doc.text(value, x, cellY + 5, { maxWidth });
      }

      const col1 = MARGIN;
      const col2 = W / 2 + 2;
      const colW = W / 2 - MARGIN - 2;

      infoCell("Attendee", ticket.attendeeName, col1, y, colW);
      infoCell("Ticket Type", ticket.tierName, col2, y, colW);
      y += 14;

      infoCell("Ticket ID", ticket.id.slice(-10).toUpperCase(), col1, y, colW);
      infoCell("Status", ticket.orderStatus === "paid" ? "Valid" : "Pending", col2, y, colW);
      y += 14;

      if (ticket.priceCents > 0) {
        infoCell("Price Paid", `$${(ticket.priceCents / 100).toFixed(2)} AUD`, col1, y, colW);
        y += 14;
      }

      // ── Footer ──
      doc.setDrawColor(220, 220, 220);
      doc.line(MARGIN, H - 10, W - MARGIN, H - 10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.5);
      doc.setTextColor(160, 160, 160);
      doc.text("Powered by EventFlow — eventflow.com.au", CENTER, H - 5, { align: "center" });

      doc.save(`ticket-${ticket.id.slice(-8).toUpperCase()}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      toast({ title: "Download failed", description: "Could not generate PDF. Try again.", variant: "destructive" });
    } finally {
      setIsPdfLoading(false);
    }
  }

  async function addToWallet() {
    if (!ticket) return;
    setIsWalletLoading(true);
    try {
      const response = await fetch(`/api/tickets/${qrToken}/wallet`);
      if (response.status === 501) {
        toast({
          title: "Apple Wallet not enabled",
          description: "This event organiser has not configured Apple Wallet. Download the PDF instead.",
        });
        return;
      }
      if (response.status === 400) {
        const data = await response.json() as { error: string };
        toast({ title: "Not available", description: data.error, variant: "destructive" });
        return;
      }
      if (!response.ok) {
        toast({ title: "Error", description: "Could not generate wallet pass.", variant: "destructive" });
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ticket-${ticket.id.slice(-8)}.pkpass`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Error", description: "Could not connect to server.", variant: "destructive" });
    } finally {
      setIsWalletLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#111] flex items-center justify-center p-4">
        <div className="w-[340px] bg-white rounded-3xl overflow-hidden animate-pulse">
          <div className="h-52 bg-gray-200" />
          <div className="h-px border-t border-dashed border-gray-300 mx-0 relative">
            <div className="absolute -left-3.5 -top-3.5 w-7 h-7 bg-[#111] rounded-full" />
            <div className="absolute -right-3.5 -top-3.5 w-7 h-7 bg-[#111] rounded-full" />
          </div>
          <div className="p-8 flex flex-col items-center gap-4">
            <div className="w-[260px] h-[260px] bg-gray-100 rounded-xl" />
            <div className="h-4 w-32 bg-gray-100 rounded-full" />
          </div>
          <div className="h-24 bg-gray-50 border-t border-gray-100" />
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-[#111] flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Ticket Not Found</h1>
        <p className="text-gray-400 text-sm mb-6">This ticket is invalid or has been removed.</p>
        <Link href="/" className="px-6 py-2.5 bg-white text-black text-sm font-semibold rounded-full hover:bg-gray-100 transition-colors">
          Return Home
        </Link>
      </div>
    );
  }

  const isPending = ticket.orderStatus !== "paid" && ticket.orderStatus !== "completed";
  const isCheckedIn = !!ticket.checkedInAt;
  const hasVenueMap = !ticket.event?.virtualUrl && (ticket.event?.venueAddress || ticket.event?.venueName);
  const mapAddress = ticket.event?.venueAddress || ticket.event?.venueName || "";

  return (
    <div
      className="min-h-screen pb-12 pt-6 px-4 flex flex-col items-center"
      style={{ background: "#111111", fontFamily: "'Inter', sans-serif" }}
    >
      <div className="w-full max-w-[360px]">
        {ticket.event && (
          <Link
            href={`/e/${ticket.event.slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors mb-5"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to event
          </Link>
        )}

        {/* ── Ticket Card (captured for PDF) ── */}
        <div ref={cardRef} className="bg-white rounded-3xl overflow-visible shadow-2xl relative">

          {/* Header — banner or gradient */}
          <div className="relative h-52 overflow-hidden rounded-t-3xl">
            {ticket.event?.bannerUrl ? (
              <img
                src={ticket.event.bannerUrl}
                alt={ticket.event.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full"
                style={{ background: "linear-gradient(135deg, #0D0D0D 0%, #1a1a2e 50%, #16213e 100%)" }}
              />
            )}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)" }} />

            <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
              {isPending && (
                <div className="inline-flex items-center gap-1 bg-amber-400 text-black text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-2">
                  Payment pending
                </div>
              )}
              {ticket.event && (
                <>
                  <h1 className="text-white font-bold text-xl leading-tight mb-1">{ticket.event.title}</h1>
                  <div className="flex items-center gap-3 text-white/70 text-xs">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(ticket.event.startAt), "MMM d, yyyy")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(ticket.event.startAt), "h:mm a")}
                    </span>
                  </div>
                  {(ticket.event.venueName || ticket.event.virtualUrl) && (
                    <div className="flex items-center gap-1 text-white/50 text-xs mt-1">
                      <MapPin className="h-3 w-3" />
                      {ticket.event.virtualUrl ? "Online Event" : ticket.event.venueName}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Tear-line with notches */}
          <div className="relative h-0 flex items-center">
            <div className="absolute -left-3.5 w-7 h-7 rounded-full" style={{ background: "#111111" }} />
            <div className="absolute -right-3.5 w-7 h-7 rounded-full" style={{ background: "#111111" }} />
            <div className="w-full border-t-2 border-dashed border-gray-200 mx-4" />
          </div>

          {/* QR Code */}
          <div className="pt-7 pb-5 px-6 flex flex-col items-center bg-white">
            {isCheckedIn && (
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
                <CheckCircle2 className="h-3.5 w-3.5" /> Checked In — {format(new Date(ticket.checkedInAt!), "h:mm a")}
              </div>
            )}
            <div
              className="p-3 rounded-2xl"
              style={{
                background: isCheckedIn ? "#F0FDF4" : "#FFFFFF",
                border: isCheckedIn ? "2px solid #86EFAC" : "2px solid #F0F0F0",
                opacity: isCheckedIn ? 0.6 : 1,
              }}
            >
              <canvas ref={canvasRef} className="block w-full max-w-[260px]" style={{ aspectRatio: "1" }} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mt-4">
              {isCheckedIn ? "Already used" : "Scan at entrance"}
            </p>
          </div>

          {/* Attendee info footer */}
          <div className="px-6 py-5 rounded-b-3xl" style={{ background: "#F7F7F7", borderTop: "1px solid #EEEEEE" }}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Attendee</p>
                <p className="font-bold text-gray-900 text-sm truncate">{ticket.attendeeName}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Ticket Type</p>
                <p className="font-bold text-gray-900 text-sm truncate">{ticket.tierName}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Ticket ID</p>
                <p className="font-mono text-xs text-gray-600">{ticket.id.slice(-10).toUpperCase()}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Status</p>
                {isPending ? (
                  <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Pending
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="h-2.5 w-2.5" /> Valid
                  </span>
                )}
              </div>
            </div>
            {ticket.priceCents > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Price Paid</p>
                <p className="font-bold text-gray-900">${(ticket.priceCents / 100).toFixed(2)}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Action Buttons ── */}
        <div className="mt-4 space-y-2.5">
          {/* Download PDF */}
          <button
            onClick={downloadPDF}
            disabled={isPdfLoading}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-white text-black font-bold text-sm rounded-2xl hover:bg-gray-100 transition-colors disabled:opacity-60"
          >
            {isPdfLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isPdfLoading ? "Generating PDF…" : "Download Ticket PDF"}
          </button>

          {/* Add to Apple Wallet */}
          <button
            onClick={addToWallet}
            disabled={isWalletLoading || isPending}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-black text-white font-bold text-sm rounded-2xl hover:bg-gray-900 transition-colors disabled:opacity-60"
            title={isPending ? "Only available for paid tickets" : undefined}
          >
            {isWalletLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.0001 2C8.6668 2 5.83347 3.83333 4.33347 6.5C2.1668 6.83333 0.666797 8.66667 0.666797 10.8333C0.666797 13.3333 2.7668 15.3333 5.3668 15.3333H8.3668V13.3333H5.3668C3.8668 13.3333 2.6668 12.1667 2.6668 10.8333C2.6668 9.5 3.7668 8.33333 5.1668 8.33333L5.8668 8.4L6.3001 7.83333C7.4668 5.33333 9.6335 3.66667 12.0001 3.66667C15.2001 3.66667 17.8668 6 18.1668 9.16667L18.3668 10.6667H19.6668C21.0001 10.6667 22.0001 11.6667 22.0001 13C22.0001 14.3333 21.0001 15.3333 19.6668 15.3333H15.6668V13.3333H19.6668C19.9335 13.3333 20.0001 13.3333 20.0001 13C20.0001 12.6667 19.9335 12.3333 19.6668 12.3333H16.5001C15.7668 8.16667 12.2335 5 8.00014 5C7.60014 5 7.20014 5.03333 6.8001 5.1C7.7001 3.2 9.7001 2 12.0001 2ZM12.0001 10L8.00014 14H11.0001V22H13.0001V14H16.0001L12.0001 10Z" />
              </svg>
            )}
            {isWalletLoading ? "Generating Pass…" : isPending ? "Wallet (paid orders only)" : "Add to Apple Wallet"}
          </button>
        </div>

        {/* Venue Map */}
        {hasVenueMap && (
          <div className="mt-5">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-white/40" />
              <span className="text-white/50 text-sm font-medium">{ticket.event!.venueName}</span>
            </div>
            {ticket.event!.venueAddress && (
              <p className="text-white/30 text-xs mb-3 pl-6">{ticket.event!.venueAddress}</p>
            )}
            <VenueMap address={mapAddress} className="h-48 rounded-2xl border border-white/10" />
            <a
              href={`https://maps.google.com/maps?q=${encodeURIComponent(mapAddress)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/15 text-white/70 text-sm font-medium rounded-2xl transition-colors"
            >
              Open in Google Maps
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
