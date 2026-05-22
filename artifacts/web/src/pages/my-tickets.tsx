import { useState } from "react";
import { Link } from "wouter";
import { useAuthMe, getAuthMeQueryKey, useGetMyTickets, getGetMyTicketsQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Calendar, MapPin, QrCode, Ticket, ArrowLeft, Loader2, AlertCircle, Clock, ChevronRight, FileText, Download, Wallet } from "lucide-react";
import { generateInvoicePDF } from "@/lib/generateInvoicePDF";
import { useToast } from "@/hooks/use-toast";

export default function MyTickets() {
  const { data: user, isLoading: authLoading } = useAuthMe({ query: { queryKey: getAuthMeQueryKey() } });
  const { data: orders, isLoading } = useGetMyTickets({
    query: { queryKey: getGetMyTicketsQueryKey(), enabled: !!user }
  });
  const { toast } = useToast();
  const [walletLoading, setWalletLoading] = useState<string | null>(null);

  async function handleAddToWallet(qrToken: string) {
    setWalletLoading(qrToken);
    try {
      const response = await fetch(`/api/tickets/${qrToken}/wallet`);
      if (response.status === 501) {
        toast({
          title: "Apple Wallet not enabled",
          description: "Download the PDF from the ticket page instead.",
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
      a.download = `ticket-${qrToken.slice(-8)}.pkpass`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Error", description: "Could not connect to server.", variant: "destructive" });
    } finally {
      setWalletLoading(null);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-gray-300" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center gap-4">
        <AlertCircle className="h-10 w-10 text-gray-200" />
        <h1 className="text-xl font-bold text-gray-900">Sign in to see your tickets</h1>
        <Link href="/login" className="px-8 py-3 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-900 transition-colors">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8]" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div className="bg-[#0D0D0D] pt-10 pb-16 px-6">
        <div className="max-w-2xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mb-8 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Events
          </Link>
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
              <Ticket className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">My Tickets</h1>
              <p className="text-white/40 mt-1 text-sm">{user.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 -mt-8 pb-16">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-36 bg-white rounded-2xl animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Ticket className="h-7 w-7 text-gray-300" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">No tickets yet</h3>
            <p className="text-sm text-gray-400 max-w-xs mx-auto mb-6">
              Tickets you purchase will appear here.
            </p>
            <Link href="/" className="inline-flex px-6 py-2.5 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-900 transition-colors">
              Find Events
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const isPaid = order.status === "paid";
              return (
                <div key={order.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

                  {/* Event banner thumbnail */}
                  {order.event?.bannerUrl && (
                    <div className="h-24 overflow-hidden">
                      <img src={order.event.bannerUrl} alt={order.event.title} className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* Order header */}
                  <div className="px-5 pt-4 pb-3 border-b border-gray-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">
                          {order.event?.title ?? "Unknown Event"}
                        </h3>
                        {order.event && (
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(order.event.startAt), "EEE d MMM yyyy")}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock className="h-3 w-3" />
                              {format(new Date(order.event.startAt), "h:mm a")}
                            </span>
                            {(order.event.venueName || order.event.virtualUrl) && (
                              <span className="flex items-center gap-1 text-xs text-gray-400">
                                <MapPin className="h-3 w-3" />
                                {order.event.virtualUrl ? "Online" : order.event.venueName}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isPaid
                              ? "bg-emerald-100 text-emerald-700"
                              : order.status === "pending"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {isPaid ? "Confirmed" : order.status}
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          {order.totalCents === 0 ? "Free" : `$${(order.totalCents / 100).toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Individual tickets — always visible */}
                  <div className="divide-y divide-gray-50">
                    {order.tickets.map((ticket) => (
                      <div key={ticket.id} className="flex items-center justify-between px-5 py-3 gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                            <QrCode className="h-3.5 w-3.5 text-gray-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{ticket.attendeeName}</p>
                            <p className="text-xs text-gray-400">{ticket.tierName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isPaid && (
                            <button
                              onClick={() => handleAddToWallet(ticket.qrToken)}
                              disabled={walletLoading === ticket.qrToken}
                              title="Add to Apple Wallet"
                              className="w-8 h-8 flex items-center justify-center rounded-xl bg-black hover:bg-gray-800 text-white transition-colors disabled:opacity-50"
                            >
                              {walletLoading === ticket.qrToken
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Wallet className="h-3.5 w-3.5" />
                              }
                            </button>
                          )}
                          <Link
                            href={`/tickets/${ticket.qrToken}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors"
                          >
                            {isPaid ? "View Ticket" : "View"} <ChevronRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order footer — actions */}
                  <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
                    <span className="text-xs text-gray-400">
                      {format(new Date(order.createdAt), "d MMM yyyy")}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          generateInvoicePDF({
                            id: order.id,
                            createdAt: order.createdAt,
                            buyerName: order.tickets[0]?.attendeeName ?? user.email,
                            buyerEmail: user.email,
                            totalCents: order.totalCents,
                            event: order.event,
                            tickets: order.tickets,
                          })
                        }
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 px-3 py-1.5 rounded-full transition-colors"
                      >
                        <FileText className="h-3 w-3" /> Invoice PDF
                      </button>
                      {order.event && (
                        <Link
                          href={`/e/${order.event.slug}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
                        >
                          View Event <ChevronRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
