import { useState } from "react";
import { useGetEvent, getGetEventQueryKey, useListEventTiers, getListEventTiersQueryKey, useCheckout, useListEventSpeakers, getListEventSpeakersQueryKey, useListEventSessions, getListEventSessionsQueryKey } from "@workspace/api-client-react";
import { useLocation, useParams, Link } from "wouter";
import { format } from "date-fns";
import {
  Calendar, MapPin, Clock, Plus, Minus, ArrowLeft, Loader2, ExternalLink,
  ChevronRight, Share2, CalendarPlus, Copy, Check as CheckIcon, User, Mic,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { VenueMap } from "@/components/VenueMap";
import { downloadICS } from "@/lib/ics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EventLanding() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: event, isLoading, error } = useGetEvent(slug, {
    query: { queryKey: getGetEventQueryKey(slug), enabled: !!slug }
  });
  const { data: tiers = [] } = useListEventTiers(event?.id ?? "", {
    query: { queryKey: getListEventTiersQueryKey(event?.id ?? ""), enabled: !!event?.id }
  });
  const { data: speakers = [] } = useListEventSpeakers(event?.id ?? "", {
    query: { queryKey: getListEventSpeakersQueryKey(event?.id ?? ""), enabled: !!event?.id }
  });
  const { data: sessions = [] } = useListEventSessions(event?.id ?? "", {
    query: { queryKey: getListEventSessionsQueryKey(event?.id ?? ""), enabled: !!event?.id }
  });

  const now = new Date();
  const visibleTiers = tiers
    .filter(t => {
      if (t.saleStartsAt && new Date(t.saleStartsAt) > now) return false;
      if (t.saleEndsAt && new Date(t.saleEndsAt) < now) return false;
      return true;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.priceCents - b.priceCents);

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [step, setStep] = useState<"select" | "attendees" | "processing">("select");
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [attendeeDetails, setAttendeeDetails] = useState<Record<string, { name: string; email: string }>>({});
  const [useBuyerForAll, setUseBuyerForAll] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState<{ code: string; discountCents: number; description: string } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [expandedSpeakers, setExpandedSpeakers] = useState<Set<string>>(new Set());
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const checkoutMutation = useCheckout();

  const toggleSpeaker = (id: string) => setExpandedSpeakers(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });
  const toggleSession = (id: string) => setExpandedSessions(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });

  const totalQty = Object.values(quantities).reduce((s, q) => s + q, 0);
  const totalCentsBeforeDiscount = visibleTiers.reduce((s, t) => s + (quantities[t.id] || 0) * t.priceCents, 0);
  const discountCents = promoApplied?.discountCents ?? 0;
  const totalCents = Math.max(0, totalCentsBeforeDiscount - discountCents);

  const handleUpdateQty = (tierId: string, delta: number, max: number | null) => {
    setQuantities(prev => {
      const next = (prev[tierId] || 0) + delta;
      if (next < 0) return prev;
      if (max !== null && next > max) return prev;
      return { ...prev, [tierId]: next };
    });
    // Clear promo if quantities change
    setPromoApplied(null);
  };

  const handleApplyPromo = async () => {
    if (!event || !promoCode.trim()) return;
    setPromoLoading(true);
    try {
      const res = await fetch(`/api/events/${event.id}/promo-codes/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: promoCode.trim(), totalCents: totalCentsBeforeDiscount }),
      });
      const data = await res.json() as any;
      if (!res.ok) {
        toast({ title: "Invalid code", description: data.error || "Promo code not found", variant: "destructive" });
        return;
      }
      setPromoApplied({ code: promoCode.trim(), discountCents: data.discountCents, description: data.description });
      toast({ title: "Promo applied!", description: data.description });
    } catch {
      toast({ title: "Error", description: "Could not validate promo code", variant: "destructive" });
    } finally {
      setPromoLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!event) return;
    setStep("processing");
    const lines = visibleTiers
      .filter(t => (quantities[t.id] ?? 0) > 0)
      .map(t => {
        const qty = quantities[t.id]!;
        const attendees = Array.from({ length: qty }, (_, i) => {
          const key = `${t.id}-${i}`;
          if (qty === 1 || useBuyerForAll) return { name: buyerName, email: buyerEmail };
          return attendeeDetails[key] ?? { name: buyerName, email: buyerEmail };
        });
        return { tierId: t.id, quantity: qty, attendees };
      });
    checkoutMutation.mutate({
      data: {
        eventId: event.id,
        buyerName,
        buyerEmail,
        lines,
        promoCode: promoApplied?.code,
      }
    }, {
      onSuccess: (result) => {
        if (result.orderId) localStorage.setItem("pendingOrderId", result.orderId);
        if (result.free) setLocation(`/checkout/success?orderId=${result.orderId}`);
        else if (result.url) window.location.href = result.url;
      },
      onError: (error) => {
        setStep(totalQty > 1 ? "attendees" : "select");
        toast({ title: "Checkout failed", description: (error.data as any)?.error || "Please try again", variant: "destructive" });
      }
    });
  };

  const handleProceed = () => totalQty === 1 ? handleCheckout() : setStep("attendees");

  const handleShare = async () => {
    const url = window.location.href;
    const title = event?.title ?? "Check out this event";
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch { /* user dismissed */ }
    } else {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      toast({ title: "Link copied!", description: "Event link copied to clipboard." });
    }
  };

  const handleAddToCalendar = () => {
    if (!event) return;
    downloadICS({
      uid: event.id,
      title: event.title,
      description: event.description ?? undefined,
      location: event.virtualUrl ?? event.venueAddress ?? event.venueName ?? undefined,
      startAt: event.startAt,
      endAt: event.endAt ?? event.startAt,
      url: window.location.href,
    }, `${slug}.ics`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white animate-pulse">
        <div className="h-[50vh] bg-gray-200 w-full" />
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="h-8 bg-gray-100 rounded-full w-2/3 mb-4" />
          <div className="h-4 bg-gray-100 rounded-full w-1/3" />
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Event Not Found</h1>
        <p className="text-gray-400 mb-6">This event doesn't exist or has been removed.</p>
        <Link href="/" className="px-6 py-2.5 bg-black text-white text-sm font-semibold rounded-full">Back to Events</Link>
      </div>
    );
  }

  const hasPhysicalVenue = !event.virtualUrl && (event.venueName || event.venueAddress);
  const mapAddress = event.venueAddress || event.venueName || "";
  const canCheckout = event.status === "published";

  const TicketPanel = (
    <div id="ticket-selector" className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Date/time header */}
      <div className="p-5 border-b border-gray-100 space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
          <span className="font-medium">{format(new Date(event.startAt), "EEEE, MMMM d, yyyy")}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Clock className="h-4 w-4 text-gray-400 shrink-0" />
          <span>
            {format(new Date(event.startAt), "h:mm a")}
            {event.endAt && ` – ${format(new Date(event.endAt), "h:mm a")}`}
          </span>
        </div>
        {/* Calendar + Share quick actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleAddToCalendar}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-full border border-gray-200 hover:border-gray-400 transition-all"
          >
            <CalendarPlus className="h-3.5 w-3.5" /> Add to Calendar
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-full border border-gray-200 hover:border-gray-400 transition-all"
          >
            {linkCopied ? <CheckIcon className="h-3.5 w-3.5 text-emerald-500" /> : <Share2 className="h-3.5 w-3.5" />}
            {linkCopied ? "Copied!" : "Share"}
          </button>
        </div>
      </div>

      <div className="p-5">
        {!canCheckout ? (
          <div className="py-8 text-center">
            <p className="text-sm font-semibold text-gray-700 mb-1">Tickets not available</p>
            <p className="text-xs text-gray-400">This event is not currently open for registration.</p>
          </div>
        ) : visibleTiers.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm font-semibold text-gray-700 mb-1">No tickets available</p>
            <p className="text-xs text-gray-400">Check back soon.</p>
          </div>
        ) : step === "select" ? (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Select Tickets</h3>

            <div className="space-y-2">
              {visibleTiers.map(tier => {
                const isSoldOut = tier.quantity != null && tier.sold >= tier.quantity;
                const ticketsLeft = tier.quantity != null ? tier.quantity - tier.sold : null;
                const almostSoldOut = ticketsLeft !== null && ticketsLeft > 0 && tier.quantity != null && tier.sold / tier.quantity > 0.7;
                const qty = quantities[tier.id] || 0;
                return (
                  <div
                    key={tier.id}
                    className={`flex items-center justify-between gap-3 p-4 rounded-xl border transition-colors ${
                      isSoldOut ? "border-gray-100 bg-gray-50 opacity-60" : qty > 0 ? "border-gray-900 bg-gray-900" : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <div>
                      <p className={`font-bold text-sm ${qty > 0 ? "text-white" : "text-gray-900"}`}>{tier.name}</p>
                      <p className={`text-sm mt-0.5 ${qty > 0 ? "text-white/70" : "text-gray-500"}`}>
                        {tier.priceCents === 0 ? "Free" : `$${(tier.priceCents / 100).toFixed(2)}`}
                      </p>
                      {isSoldOut && <p className="text-xs text-gray-400 mt-1">Sold out</p>}
                      {almostSoldOut && !isSoldOut && <p className="text-xs text-orange-500 mt-1">Only {ticketsLeft} left</p>}
                    </div>
                    {!isSoldOut && (
                      <div className={`flex items-center gap-3 rounded-lg p-1 ${qty > 0 ? "bg-white/10" : "bg-gray-100"}`}>
                        <button
                          className={`w-7 h-7 rounded-md flex items-center justify-center transition-all disabled:opacity-40 ${qty > 0 ? "text-white hover:bg-white/10" : "text-gray-600 hover:bg-white"}`}
                          onClick={() => handleUpdateQty(tier.id, -1, ticketsLeft)}
                          disabled={qty <= 0}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className={`w-5 text-center text-sm font-bold ${qty > 0 ? "text-white" : "text-gray-800"}`}>{qty}</span>
                        <button
                          className={`w-7 h-7 rounded-md flex items-center justify-center transition-all disabled:opacity-40 ${qty > 0 ? "text-white hover:bg-white/10" : "text-gray-600 hover:bg-white"}`}
                          onClick={() => handleUpdateQty(tier.id, 1, ticketsLeft)}
                          disabled={ticketsLeft !== null && qty >= ticketsLeft}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {totalQty > 0 && (
              <>
                {/* Promo code */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Promo code"
                    value={promoCode}
                    onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoApplied(null); }}
                    className="flex-1 h-10 px-3.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 uppercase"
                  />
                  <button
                    onClick={handleApplyPromo}
                    disabled={!promoCode.trim() || promoLoading || !!promoApplied}
                    className="h-10 px-4 rounded-xl bg-gray-900 text-white text-sm font-semibold disabled:opacity-40 flex items-center gap-1.5 shrink-0"
                  >
                    {promoLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : promoApplied ? <CheckIcon className="h-3.5 w-3.5" /> : null}
                    {promoApplied ? "Applied" : "Apply"}
                  </button>
                </div>
                {promoApplied && (
                  <p className="text-xs font-semibold text-emerald-600">
                    {promoApplied.description} — saving ${(promoApplied.discountCents / 100).toFixed(2)}
                  </p>
                )}

                {/* Subtotal */}
                <div className="flex items-center justify-between pt-1 pb-1">
                  <span className="text-sm text-gray-500 font-medium">Subtotal</span>
                  <div className="text-right">
                    {promoApplied && (
                      <p className="text-xs text-gray-400 line-through">${(totalCentsBeforeDiscount / 100).toFixed(2)}</p>
                    )}
                    <span className="text-xl font-bold text-gray-900">
                      {totalCents === 0 ? "Free" : `$${(totalCents / 100).toFixed(2)}`}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-1.5">Your Name</label>
                    <input
                      type="text"
                      placeholder="Jane Smith"
                      value={buyerName}
                      onChange={e => setBuyerName(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-1.5">Email Address</label>
                    <input
                      type="email"
                      placeholder="jane@example.com"
                      value={buyerEmail}
                      onChange={e => setBuyerEmail(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              className="w-full h-12 bg-black text-white font-bold text-sm rounded-xl hover:bg-gray-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
              onClick={handleProceed}
              disabled={totalQty === 0 || !buyerName.trim() || !buyerEmail.trim() || !buyerEmail.includes("@")}
            >
              {totalQty === 0 ? "Select Tickets" : totalQty === 1 ? "Get Ticket" : "Continue"}
              {totalQty > 0 && <ChevronRight className="h-4 w-4" />}
            </button>
          </div>

        ) : step === "attendees" ? (
          <div className="space-y-4">
            <button
              className="text-xs font-semibold text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors"
              onClick={() => setStep("select")}
            >
              <ArrowLeft className="h-3 w-3" /> Back
            </button>

            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Attendee Details</h3>

            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
              <Checkbox
                id="useBuyerForAll"
                checked={useBuyerForAll}
                onCheckedChange={c => setUseBuyerForAll(c === true)}
                className="rounded-sm"
              />
              <Label htmlFor="useBuyerForAll" className="text-sm font-medium text-gray-700 cursor-pointer">
                Use my details for all tickets
              </Label>
            </div>

            {!useBuyerForAll && (
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {visibleTiers.filter(t => (quantities[t.id] || 0) > 0).map(tier =>
                  Array.from({ length: quantities[tier.id] || 0 }).map((_, i) => {
                    const key = `${tier.id}-${i}`;
                    const details = attendeeDetails[key] || { name: "", email: "" };
                    return (
                      <div key={key} className="border border-gray-200 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-bold text-gray-700">{tier.name} — Ticket {i + 1}</p>
                        <input
                          type="text"
                          placeholder="Name"
                          className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                          value={details.name}
                          onChange={e => setAttendeeDetails(prev => ({ ...prev, [key]: { ...details, name: e.target.value } }))}
                        />
                        <input
                          type="email"
                          placeholder="Email"
                          className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                          value={details.email}
                          onChange={e => setAttendeeDetails(prev => ({ ...prev, [key]: { ...details, email: e.target.value } }))}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            )}

            <button
              className="w-full h-12 bg-black text-white font-bold text-sm rounded-xl hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
              onClick={handleCheckout}
            >
              Complete Registration <ChevronRight className="h-4 w-4" />
            </button>
          </div>

        ) : (
          <div className="py-16 flex flex-col items-center text-center gap-3">
            <Loader2 className="h-8 w-8 text-gray-300 animate-spin" />
            <p className="text-sm font-semibold text-gray-700">Processing…</p>
            <p className="text-xs text-gray-400">Don't close this page.</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Full-bleed banner ── */}
      <div className="relative w-full overflow-hidden" style={{ height: "55vw", maxHeight: 520, minHeight: 240 }}>
        {event.bannerUrl ? (
          <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: "linear-gradient(135deg, #0D0D0D 0%, #1a1a2e 40%, #16213e 100%)" }}
          />
        )}

        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.1) 100%)" }} />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 px-4 sm:px-6 pt-4 sm:pt-5 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-medium transition-colors bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Events
          </Link>
          {event.category && (
            <span className="text-xs font-bold uppercase tracking-wider bg-black/30 backdrop-blur-sm text-white/80 px-3 py-1.5 rounded-full">
              {event.category}
            </span>
          )}
        </div>

        {/* Event info at bottom of banner */}
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 pb-6 sm:pb-8">
          <div className="max-w-6xl mx-auto">
            {event.status !== "published" && (
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-black px-2.5 py-1 rounded-full mb-3">
                {event.status}
              </span>
            )}
            <h1 className="text-white font-black text-2xl sm:text-4xl md:text-5xl leading-tight tracking-tight mb-2 sm:mb-3" style={{ fontFamily: "'Inter', sans-serif" }}>
              {event.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-white/60 text-xs sm:text-sm">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                {format(new Date(event.startAt), "EEE, MMM d, yyyy")}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                {format(new Date(event.startAt), "h:mm a")}
                {event.endAt && ` – ${format(new Date(event.endAt), "h:mm a")}`}
              </span>
              {hasPhysicalVenue && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" /> {event.venueName}
                </span>
              )}
              {event.virtualUrl && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" /> Online Event
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">

          {/* On mobile: tickets first (order-1), on desktop: content first (lg:order-1) */}
          <div className="order-1 lg:order-2 lg:col-span-5">
            <div className="sticky top-20">
              {TicketPanel}
            </div>
          </div>

          {/* Left: content — second on mobile (order-2), first on desktop */}
          <div className="order-2 lg:order-1 lg:col-span-7 space-y-8 sm:space-y-10">

            {/* Organiser row */}
            <div className="flex items-center gap-3 py-4 border-y border-gray-100">
              <div className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {event.organiserName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400">Organised by</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{event.organiserName}</p>
              </div>
              {/* Share buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleShare}
                  className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors"
                >
                  {linkCopied ? (
                    <><CheckIcon className="h-3.5 w-3.5 text-emerald-500" /> Copied</>
                  ) : (
                    <><Share2 className="h-3.5 w-3.5" /> Share</>
                  )}
                </button>
              </div>
            </div>

            {/* ── Content Tabs ── */}
            {(() => {
              const hasAgenda = sessions.length > 0 || speakers.length > 0;
              const tabs = [
                ...(event.description ? ["about"] : []),
                ...(hasAgenda ? ["agenda"] : []),
              ];
              const defaultTab = tabs[0] ?? "about";

              const AgendaContent = (
                <div className="space-y-8">
                  {/* Speakers */}
                  {speakers.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                        <Mic className="h-3.5 w-3.5" /> Speakers
                      </h3>
                      <div className="space-y-3">
                        {speakers.map(speaker => (
                          <div key={speaker.id} className="rounded-2xl border border-gray-100 overflow-hidden">
                            <button
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                              onClick={() => speaker.bio && toggleSpeaker(speaker.id)}
                            >
                              {speaker.photoUrl ? (
                                <img src={speaker.photoUrl} alt={speaker.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                  <User className="h-5 w-5 text-gray-300" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 text-sm">{speaker.name}</p>
                                {speaker.bio && !expandedSpeakers.has(speaker.id) && (
                                  <p className="text-xs text-gray-400 truncate mt-0.5">{speaker.bio}</p>
                                )}
                              </div>
                              {speaker.bio && (
                                <span className="text-gray-300 shrink-0">
                                  {expandedSpeakers.has(speaker.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </span>
                              )}
                            </button>
                            {expandedSpeakers.has(speaker.id) && speaker.bio && (
                              <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-50 pt-3">
                                {speaker.bio}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sessions */}
                  {sessions.length > 0 && (
                    <div>
                      {speakers.length > 0 && (
                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5" /> Schedule
                        </h3>
                      )}
                      {(() => {
                        const sessionsByDay = sessions.reduce<Record<string, typeof sessions>>((acc, s) => {
                          const day = format(new Date(s.startAt), "yyyy-MM-dd");
                          if (!acc[day]) acc[day] = [];
                          acc[day].push(s);
                          return acc;
                        }, {});
                        return (
                          <div className="space-y-4">
                            {Object.entries(sessionsByDay).map(([day, daySessions]) => (
                              <div key={day}>
                                {Object.keys(sessionsByDay).length > 1 && (
                                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                                    {format(new Date(day + "T00:00:00"), "EEEE, MMMM d")}
                                  </p>
                                )}
                                <div className="space-y-2">
                                  {daySessions.map(session => {
                                    const speaker = speakers.find(s => s.id === session.speakerId);
                                    const hasDetails = !!(session.description || speaker?.bio);
                                    const expanded = expandedSessions.has(session.id);
                                    const durationMins = Math.round((new Date(session.endAt).getTime() - new Date(session.startAt).getTime()) / 60000);
                                    return (
                                      <div key={session.id} className="rounded-2xl border border-gray-100 overflow-hidden">
                                        <button
                                          className="w-full flex items-start gap-4 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                                          onClick={() => hasDetails && toggleSession(session.id)}
                                        >
                                          <div className="w-16 shrink-0 text-right pt-0.5">
                                            <p className="text-xs font-bold text-gray-700">{format(new Date(session.startAt), "h:mm a")}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">{durationMins}m</p>
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900 text-sm leading-snug">{session.title}</p>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                                              {speaker && (
                                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                                  <User className="h-3 w-3" /> {speaker.name}
                                                </span>
                                              )}
                                              {session.roomName && (
                                                <span className="flex items-center gap-1 text-xs text-gray-400">
                                                  <MapPin className="h-3 w-3" /> {session.roomName}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          {hasDetails && (
                                            <span className="text-gray-300 shrink-0 pt-0.5">
                                              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </span>
                                          )}
                                        </button>
                                        {expanded && (session.description || speaker?.bio) && (
                                          <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-2">
                                            {session.description && (
                                              <p className="text-sm text-gray-600 leading-relaxed">{session.description}</p>
                                            )}
                                            {speaker && speaker.bio && (
                                              <div className="flex items-start gap-2 pt-1">
                                                {speaker.photoUrl ? (
                                                  <img src={speaker.photoUrl} alt={speaker.name} className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5" />
                                                ) : (
                                                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                                                    <User className="h-3.5 w-3.5 text-gray-300" />
                                                  </div>
                                                )}
                                                <div>
                                                  <p className="text-xs font-semibold text-gray-700">{speaker.name}</p>
                                                  <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{speaker.bio}</p>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );

              if (tabs.length === 0) return null;
              if (tabs.length === 1 && tabs[0] === "about") {
                return (
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">About</h2>
                    <div className="text-gray-700 leading-relaxed text-sm sm:text-base whitespace-pre-wrap">
                      {event.description}
                    </div>
                  </div>
                );
              }
              if (tabs.length === 1 && tabs[0] === "agenda") {
                return AgendaContent;
              }
              return (
                <Tabs defaultValue={defaultTab}>
                  <div className="overflow-x-auto -mx-1 px-1 mb-5">
                    <TabsList className="h-auto p-1 bg-gray-100 w-max inline-flex rounded-full border-0">
                      {tabs.includes("about") && (
                        <TabsTrigger value="about" className="rounded-full px-4 py-1.5 text-sm font-medium capitalize data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 border-0 transition-all">
                          About
                        </TabsTrigger>
                      )}
                      {tabs.includes("agenda") && (
                        <TabsTrigger value="agenda" className="rounded-full px-4 py-1.5 text-sm font-medium capitalize data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 border-0 transition-all">
                          Agenda
                        </TabsTrigger>
                      )}
                    </TabsList>
                  </div>
                  {tabs.includes("about") && (
                    <TabsContent value="about">
                      <div className="text-gray-700 leading-relaxed text-sm sm:text-base whitespace-pre-wrap">
                        {event.description}
                      </div>
                    </TabsContent>
                  )}
                  {tabs.includes("agenda") && (
                    <TabsContent value="agenda">
                      {AgendaContent}
                    </TabsContent>
                  )}
                </Tabs>
              );
            })()}

            {/* Location */}
            {hasPhysicalVenue && (
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Location</h2>
                <VenueMap address={mapAddress} className="h-48 sm:h-56 rounded-2xl mb-3" />
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    {event.venueName && <p className="font-semibold text-gray-900 text-sm">{event.venueName}</p>}
                    {event.venueAddress && <p className="text-sm text-gray-500 mt-0.5">{event.venueAddress}</p>}
                  </div>
                  <a
                    href={`https://maps.google.com/maps?q=${encodeURIComponent(mapAddress)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-xs font-semibold text-gray-400 hover:text-gray-700 flex items-center gap-1 shrink-0 transition-colors"
                  >
                    Open Maps <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}

            {event.virtualUrl && (
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Location</h2>
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl">
                  <MapPin className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">Online Event</p>
                    <a href={event.virtualUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline mt-0.5 inline-block break-all">
                      {event.virtualUrl}
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile sticky bottom CTA ── */}
      {canCheckout && step === "select" && visibleTiers.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden p-3 safe-area-pb"
          style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderTop: "1px solid rgba(0,0,0,0.08)" }}
        >
          <button
            onClick={() => document.getElementById("ticket-selector")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="w-full h-12 bg-black text-white font-bold text-sm rounded-xl hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
          >
            {totalQty > 0
              ? `${totalQty} ticket${totalQty > 1 ? "s" : ""} · ${totalCents === 0 ? "Free" : `$${(totalCents / 100).toFixed(2)}`}`
              : "Get Tickets"}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
