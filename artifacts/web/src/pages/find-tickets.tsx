import { useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Search, Calendar, MapPin, Loader2, ArrowLeft, QrCode, ChevronRight, Ticket } from "lucide-react";
import { formatAUD } from "@/lib/ics";

type Order = {
  id: string;
  createdAt: string;
  totalCents: number;
  event: { title: string; slug: string; startAt: string; venueName: string | null } | null;
  tickets: { id: string; tierName: string; attendeeName: string; qrToken: string }[];
};

export default function FindTickets() {
  const [email, setEmail] = useState("");
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/find-tickets-by-email?email=${encodeURIComponent(email.trim())}`);
      if (res.ok) setOrders(await res.json());
      else setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F8]" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Dark hero header */}
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
              <h1 className="text-3xl font-bold text-white">Find my tickets</h1>
              <p className="text-white/40 mt-1 text-sm">Enter your email to retrieve your orders.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 -mt-8 pb-16">

        {/* Search form */}
        <form onSubmit={onSearch} className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Email address</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 h-12 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 h-12 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-900 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </button>
          </div>
        </form>

        {/* No results */}
        {searched && !loading && orders.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
            <Ticket className="h-8 w-8 text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-700 mb-1">No tickets found</p>
            <p className="text-sm text-gray-400">Check the email address and ensure payment was completed.</p>
          </div>
        )}

        {/* Results */}
        {orders.length > 0 && (
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 px-1">
              {orders.length} order{orders.length !== 1 ? "s" : ""} found
            </p>
            {orders.map((o) => (
              <div key={o.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {/* Order header */}
                <div className="p-5 border-b border-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-gray-900">{o.event?.title ?? "Event"}</h3>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 mt-1.5 text-xs text-gray-400">
                        {o.event && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(o.event.startAt), "EEE d MMM yyyy")}
                          </span>
                        )}
                        {o.event?.venueName && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {o.event.venueName}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-bold text-gray-900 shrink-0">{formatAUD(o.totalCents)}</span>
                  </div>
                </div>

                {/* Tickets */}
                <div className="divide-y divide-gray-50">
                  {o.tickets.map((t) => (
                    <Link
                      key={t.id}
                      href={`/tickets/${t.qrToken}`}
                      className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
                          <QrCode className="h-4 w-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{t.attendeeName}</p>
                          <p className="text-xs text-gray-400">{t.tierName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-semibold text-gray-400">
                        View QR <ChevronRight className="h-3.5 w-3.5" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
