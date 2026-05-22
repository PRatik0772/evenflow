import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useGetOrder, getGetOrderQueryKey } from "@workspace/api-client-react";
import { CheckCircle2, Calendar, MapPin, Loader2, ArrowLeft, Download, QrCode, ChevronRight, FileText, Clock } from "lucide-react";
import { format } from "date-fns";
import { downloadICS } from "@/lib/ics";
import { generateInvoicePDF } from "@/lib/generateInvoicePDF";
import { useQueryClient } from "@tanstack/react-query";

export default function CheckoutSuccess() {
  const queryClient = useQueryClient();
  const searchParams = new URLSearchParams(window.location.search);
  const queryOrderId = searchParams.get("orderId");
  const sessionId = searchParams.get("session_id");

  const [orderId, setOrderId] = useState<string | null>(queryOrderId);
  const [confirming, setConfirming] = useState(!!sessionId);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const didConfirm = useRef(false);

  useEffect(() => {
    if (!sessionId || didConfirm.current) return;
    didConfirm.current = true;

    async function confirm() {
      setConfirming(true);
      try {
        // Recover orderId from localStorage (set just before Stripe redirect)
        const pending = localStorage.getItem("pendingOrderId");
        if (pending && !orderId) setOrderId(pending);
        localStorage.removeItem("pendingOrderId");

        // Confirm payment with server (which verifies against Stripe)
        const res = await fetch("/api/checkout/confirm-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ sessionId }),
        });

        if (res.ok) {
          const data = await res.json() as { ok: boolean; orderId: string };
          setOrderId(data.orderId);
          // Bust the cached order so we see the updated "paid" status
          queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(data.orderId) });
        } else if (res.status === 402) {
          setConfirmError("Payment is still processing. Your tickets will appear shortly.");
        }
      } catch {
        // Network error — fall back to whatever orderId we have
      } finally {
        setConfirming(false);
      }
    }

    confirm();
  }, [sessionId]);

  const { data: order, isLoading: orderLoading } = useGetOrder(orderId || "", {
    query: {
      queryKey: getGetOrderQueryKey(orderId || ""),
      enabled: !!orderId && !confirming,
      // Poll while status is still pending (webhook may arrive shortly)
      refetchInterval: (query) => {
        const d = query.state.data as { status?: string } | undefined;
        return d?.status === "paid" ? false : (5000 as number | false);
      },
    }
  });

  const isLoading = confirming || (!!orderId && orderLoading);

  if (!orderId && !sessionId) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Invalid Request</h1>
        <p className="text-gray-500 mb-6">No order details found.</p>
        <Link href="/" className="px-6 py-2.5 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-900 transition-colors">
          Return Home
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
        <p className="text-gray-500 text-sm">Confirming your payment…</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Payment Confirmed</h1>
        {confirmError && <p className="text-amber-600 text-sm mb-4">{confirmError}</p>}
        <p className="text-gray-500 mb-8">Check your email for your tickets.</p>
        <Link href="/my-tickets" className="px-8 py-3 bg-black text-white font-semibold rounded-full hover:bg-gray-900 transition-colors">
          My Tickets
        </Link>
      </div>
    );
  }

  const isPaid = (order as { status?: string }).status === "paid";

  return (
    <div className="min-h-screen bg-[#F8F8F8]" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Dark hero */}
      <div className="bg-[#0D0D0D] pt-10 pb-16 px-6">
        <div className="max-w-2xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mb-8 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Browse Events
          </Link>
          <div className="flex items-start gap-5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 mt-1 ${isPaid ? "bg-emerald-500" : "bg-amber-400"}`}>
              {isPaid
                ? <CheckCircle2 className="h-6 w-6 text-white" />
                : <Clock className="h-6 w-6 text-white" />
              }
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white leading-tight">
                {isPaid ? "You're going!" : "Order received!"}
              </h1>
              <p className="text-white/50 mt-1">
                {isPaid
                  ? `Confirmed for ${order.buyerName}. Tickets are below — screenshot or tap to show at the door.`
                  : `Order placed for ${order.buyerName}. Payment is being confirmed.`
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 -mt-8 pb-16">

        {/* Event info card */}
        {order.event && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
            {order.event.bannerUrl && (
              <div className="h-36 overflow-hidden">
                <img src={order.event.bannerUrl} alt={order.event.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-5">
              <h2 className="font-bold text-gray-900 text-lg mb-3">{order.event.title}</h2>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="h-4 w-4 shrink-0" />
                  {format(new Date(order.event.startAt), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                </div>
                {(order.event.venueName || order.event.virtualUrl) && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {order.event.virtualUrl ? "Online Event" : order.event.venueName}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tickets */}
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 px-1">Your Tickets</p>
          <div className="space-y-2">
            {order.tickets.map((ticket, i) => (
              <Link
                key={ticket.id || i}
                href={ticket.qrToken ? `/tickets/${ticket.qrToken}` : "#"}
                className="block bg-white rounded-2xl border border-gray-100 hover:border-gray-300 transition-colors overflow-hidden"
              >
                <div className="flex items-center gap-4 p-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg, #2DD4BF, #8B5CF6)" }}
                  >
                    <QrCode className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">{ticket.attendeeName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {ticket.tierName} · {ticket.priceCents === 0 ? "Free" : `$${(ticket.priceCents / 100).toFixed(2)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-gray-400">
                    View Ticket <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Receipt / total */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
          <div className="p-5 flex items-center justify-between border-b border-gray-50">
            <span className="text-sm font-medium text-gray-500">Total Charged</span>
            <span className="text-2xl font-bold text-gray-900">
              {order.totalCents === 0 ? "Free" : `$${(order.totalCents / 100).toFixed(2)}`}
            </span>
          </div>
          <div className="px-5 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Order ID</p>
              <p className="font-mono text-sm text-gray-600 mt-0.5">ORD-{order.id.slice(-8).toUpperCase()}</p>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
              isPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }`}>
              {isPaid ? "Paid" : "Pending"}
            </span>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          {/* Invoice PDF — always show */}
          <button
            onClick={() => generateInvoicePDF({
              id: order.id,
              createdAt: new Date().toISOString(),
              buyerName: order.buyerName,
              buyerEmail: order.buyerEmail,
              totalCents: order.totalCents,
              event: order.event,
              tickets: order.tickets,
            })}
            className="flex items-center justify-center gap-2 py-3 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-900 transition-colors"
          >
            <FileText className="h-4 w-4" /> Download Invoice PDF
          </button>

          <div className="flex flex-col sm:flex-row gap-3">
            {order.event && (
              <button
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-full hover:bg-gray-50 transition-colors"
                onClick={() => downloadICS({
                  uid: order.id,
                  title: order.event!.title,
                  description: order.event!.description ?? undefined,
                  location: order.event!.venueName ?? order.event!.venueAddress ?? undefined,
                  startAt: order.event!.startAt,
                  endAt: order.event!.endAt ?? new Date(new Date(order.event!.startAt).getTime() + 2 * 60 * 60 * 1000),
                  url: order.event!.virtualUrl ?? undefined,
                }, `${order.event!.slug}.ics`)}
              >
                <Download className="h-4 w-4" /> Add to Calendar
              </button>
            )}
            <Link
              href="/my-tickets"
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-full hover:bg-gray-50 transition-colors"
            >
              My Tickets
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
