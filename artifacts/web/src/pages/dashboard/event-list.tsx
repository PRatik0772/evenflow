import React, { useState, useEffect, useRef } from "react";
import {
  useAuthMe, getAuthMeQueryKey,
  useListMyEvents, getListMyEventsQueryKey,
  useGetOrganiserStats, getGetOrganiserStatsQueryKey,
} from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { format, isAfter, isBefore, isWithinInterval } from "date-fns";
import {
  Calendar, MapPin, MoreHorizontal, ArrowUpRight,
  Plus, Ticket, Users, TrendingUp, CheckCircle2, Edit, Settings2,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const CHIPS = ["All Events", "Upcoming", "Live", "Draft", "Past"] as const;
type Chip = typeof CHIPS[number];

function getHourGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function statusClass(status: string, startAt: string, endAt?: string | null): string {
  if (status === "draft") return "draft";
  if (status === "cancelled") return "cancelled";
  if (status === "completed") return "completed";
  const now = new Date();
  const start = new Date(startAt);
  const end = endAt ? new Date(endAt) : null;
  if (end && isWithinInterval(now, { start, end })) return "live";
  if (isAfter(start, now)) return "published";
  return "completed";
}

function statusLabel(sc: string) {
  if (sc === "live") return "Live";
  if (sc === "published") return "Published";
  if (sc === "draft") return "Draft";
  if (sc === "cancelled") return "Cancelled";
  return "Completed";
}

const STATUS_ACCENT: Record<string, string> = {
  live:      "#8B5CF6",
  published: "#10B981",
  draft:     "#F59E0B",
  cancelled: "#EF4444",
  completed: "#6B7280",
};

const SPARKLINE_VALS = [4, 7, 5, 8, 12, 15, 10, 18, 24, 20, 28, 32];
const CHART_VALS    = [38, 55, 42, 75, 52, 88, 70];
const CHART_DAYS    = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function DashboardEventList() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading: authLoading } = useAuthMe({ query: { queryKey: getAuthMeQueryKey() } });
  const { data: events = [], isLoading: eventsLoading } = useListMyEvents({
    query: { enabled: !!user && user.role === "organiser", queryKey: getListMyEventsQueryKey() },
  });
  const { data: stats } = useGetOrganiserStats({
    query: { queryKey: getGetOrganiserStatsQueryKey(), enabled: !!user && user.role === "organiser" },
  });

  const [activeChip, setActiveChip] = useState<number>(0);
  const chipRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const el = chipRefs.current[activeChip];
    if (el) setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth });
  }, [activeChip, events.length]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "organiser") {
    setLocation("/");
    return null;
  }

  const now = new Date();
  const filtered = events.filter(ev => {
    const sc = statusClass(ev.status, ev.startAt, ev.endAt);
    const chip = CHIPS[activeChip];
    if (chip === "All Events") return true;
    if (chip === "Live")     return sc === "live";
    if (chip === "Draft")    return sc === "draft";
    if (chip === "Past")     return sc === "completed" || sc === "cancelled";
    if (chip === "Upcoming") return sc === "published" && isAfter(new Date(ev.startAt), now);
    return true;
  });

  const revenueFormatted = stats
    ? `$${(stats.totalRevenueCents / 100).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : "—";

  return (
    <div style={{ background: "#FDFDFC", minHeight: "100vh", paddingBottom: 100, fontFamily: "'Inter', sans-serif" }}>
      {/* Main container */}
      <div className="max-w-[1280px] mx-auto px-6 py-10">

        {/* ── Greeting header ── */}
        <header className="mb-10 aurora-fade-in-slide" style={{ animationDelay: "0.05s" }}>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
            {format(now, "EEEE, MMM d").toUpperCase()}
          </p>
          <h1 className="aurora-heading text-3xl sm:text-5xl text-gray-900 mb-8">
            {getHourGreeting()}, {user.name.split(" ")[0]}.
          </h1>

          {/* Chip filter */}
          <div className="aurora-chip-track">
            <div
              className="aurora-chip-indicator"
              style={{ transform: `translateX(${indicatorStyle.left}px)`, width: indicatorStyle.width }}
            />
            {CHIPS.map((chip, i) => (
              <div
                key={chip}
                ref={el => { chipRefs.current[i] = el; }}
                className={`aurora-chip${activeChip === i ? " active" : ""}`}
                onClick={() => setActiveChip(i)}
              >
                {chip}
              </div>
            ))}
          </div>
        </header>

        {/* ── Two-column grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* ── Left: event feed ── */}
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">Your Events</h2>
              <Link
                href="/dashboard/events"
                className="text-sm text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors"
              >
                View all <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {eventsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-base font-medium text-gray-700 mb-1">No events here</p>
                <p className="text-sm text-gray-400 mb-6">
                  {activeChip === 0
                    ? "Create your first event to get started."
                    : `No ${CHIPS[activeChip].toLowerCase()} events.`}
                </p>
                {activeChip === 0 && (
                  <Link
                    href="/dashboard/events/new"
                    className="inline-flex items-center gap-2 px-5 py-2.5 aurora-gradient text-white text-sm font-medium rounded-full hover:opacity-90 transition-opacity"
                  >
                    <Plus className="w-4 h-4" /> Create Event
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((event, idx) => {
                  const sc = statusClass(event.status, event.startAt, event.endAt);
                  const accent = STATUS_ACCENT[sc] ?? "#e5e7eb";
                  return (
                    <div
                      key={event.id}
                      className="aurora-event-card aurora-fade-in-slide p-6 pl-8"
                      style={{
                        "--aurora-card-accent": accent,
                        animationDelay: `${0.15 + idx * 0.08}s`,
                      } as React.CSSProperties}
                      onClick={() => setLocation(`/dashboard/events/${event.id}`)}
                    >
                      {/* Card header */}
                      <div className="flex justify-between items-start">
                        <div className="flex-1 pr-4">
                          <div className="flex items-center gap-2.5 mb-2">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 aurora-dot-${sc}`}
                            />
                            <span className="text-xs font-semibold tracking-wider uppercase text-gray-400">
                              {statusLabel(sc)}
                            </span>
                          </div>
                          <h3 className="aurora-heading text-2xl text-gray-900 mb-2 leading-tight">
                            {event.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              {format(new Date(event.startAt), "d MMM yyyy")}
                              {event.endAt && ` — ${format(new Date(event.endAt), "d MMM yyyy")}`}
                            </span>
                            {(event.venueName || event.venueAddress || event.virtualUrl) && (
                              <span className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                {event.virtualUrl
                                  ? "Online Event"
                                  : [event.venueName, event.venueAddress].filter(Boolean).join(", ")}
                              </span>
                            )}
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                            <button className="p-2 text-gray-300 hover:text-gray-700 hover:bg-gray-50 rounded-full transition-colors">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl shadow-lg">
                            <DropdownMenuItem
                              onClick={e => { e.stopPropagation(); setLocation(`/dashboard/events/${event.id}`); }}
                              className="cursor-pointer"
                            >
                              <Settings2 className="mr-2 h-4 w-4" /> Manage Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={e => { e.stopPropagation(); setLocation(`/dashboard/events/${event.id}/edit`); }}
                              className="cursor-pointer"
                            >
                              <Edit className="mr-2 h-4 w-4" /> Edit Content
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Card footer */}
                      <div className="mt-6 pt-5 border-t border-gray-50 flex items-end justify-between gap-6">
                        <div className="flex gap-8">
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Status</p>
                            <p
                              className="text-sm font-semibold"
                              style={{ color: accent }}
                            >
                              {statusLabel(sc)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Event Type</p>
                            <p className="text-sm font-medium text-gray-700">
                              {event.virtualUrl ? "Online" : "In Person"}
                            </p>
                          </div>
                        </div>

                        <button
                          className="flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-full border border-gray-200 hover:border-transparent hover:text-white relative overflow-hidden group transition-all"
                          onClick={e => { e.stopPropagation(); setLocation(`/dashboard/events/${event.id}`); }}
                        >
                          <span className="absolute inset-0 aurora-gradient opacity-0 group-hover:opacity-100 transition-opacity" />
                          <span className="relative z-10 flex items-center gap-1.5 text-gray-600 group-hover:text-white transition-colors">
                            Manage <ArrowUpRight className="w-3.5 h-3.5" />
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Right sidebar ── */}
          <div className="lg:col-span-4 space-y-6 aurora-fade-in-slide" style={{ animationDelay: "0.3s" }}>

            {/* Stats cards row */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Events", value: stats?.totalEvents ?? 0, icon: <Calendar className="w-4 h-4" />, color: "#3B82F6", bg: "#EFF6FF" },
                { label: "Published", value: stats?.publishedEvents ?? 0, icon: <CheckCircle2 className="w-4 h-4" />, color: "#10B981", bg: "#ECFDF5" },
                { label: "Tickets Sold", value: stats?.totalTicketsSold ?? 0, icon: <Ticket className="w-4 h-4" />, color: "#8B5CF6", bg: "#F5F3FF" },
                { label: "Drafts", value: stats?.draftEvents ?? 0, icon: <TrendingUp className="w-4 h-4" />, color: "#F59E0B", bg: "#FFFBEB" },
              ].map((card, i) => (
                <div
                  key={card.label}
                  className="bg-white rounded-2xl p-4 border border-gray-100"
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: card.bg, color: card.color }}
                  >
                    {card.icon}
                  </div>
                  <p className="aurora-heading text-2xl text-gray-900">{card.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{card.label}</p>
                </div>
              ))}
            </div>

            {/* Revenue widget */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 relative overflow-hidden">
              <div
                className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl -mr-8 -mt-8"
                style={{ background: "rgba(139,92,246,0.07)" }}
              />
              <p className="text-xs font-medium text-gray-400 mb-1">Total Revenue</p>
              <div className="flex items-end gap-2 mb-5">
                <p className="aurora-heading text-4xl text-gray-900">{revenueFormatted}</p>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mb-1 flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" /> AUD
                </span>
              </div>
              <div className="aurora-sparkline">
                {SPARKLINE_VALS.map((val, i) => (
                  <div
                    key={i}
                    className="aurora-sparkline-bar aurora-bar-rise"
                    style={{ height: `${val * 2.8}%`, animationDelay: `${0.4 + i * 0.04}s` }}
                  />
                ))}
              </div>
            </div>

            {/* Performance chart */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Performance Overview</h3>
              <div className="aurora-chart">
                {CHART_VALS.map((val, i) => (
                  <div
                    key={i}
                    className={`aurora-chart-bar aurora-bar-rise${i === 5 ? " active" : ""}`}
                    style={{ height: `${val}%`, animationDelay: `${0.5 + i * 0.08}s` }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-2">
                {CHART_DAYS.map((d, i) => (
                  <span
                    key={d}
                    className="text-[11px] flex-1 text-center"
                    style={{ color: i === 5 ? "#3B82F6" : "#9CA3AF", fontWeight: i === 5 ? 600 : 400 }}
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>

            {/* Recent orders */}
            {stats?.recentOrders && stats.recentOrders.length > 0 && (
              <div className="pt-5 border-t border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center justify-between">
                  Recent Orders
                  <Users className="w-4 h-4 text-gray-300" />
                </h3>
                <div className="space-y-3">
                  {stats.recentOrders.slice(0, 4).map(order => (
                    <div key={order.id} className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full aurora-gradient flex items-center justify-center text-white text-xs font-semibold shrink-0"
                      >
                        {order.buyerName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{order.buyerName}</p>
                        <p className="text-xs text-gray-400 truncate">{order.buyerEmail}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-gray-800">
                          ${(order.totalCents / 100).toFixed(2)}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {format(new Date(order.createdAt), "d MMM")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Floating bottom stats bar ── */}
      <div className="aurora-float-bar aurora-fade-in-slide" style={{ animationDelay: "0.6s" }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
            <Ticket className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 leading-none mb-0.5">Tickets Sold</p>
            <p className="text-sm font-semibold text-gray-900 aurora-tick-up" style={{ animationDelay: "0.8s" }}>
              {(stats?.totalTicketsSold ?? 0).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="w-px h-7 bg-gray-100" />
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 leading-none mb-0.5">Revenue</p>
            <p className="text-sm font-semibold text-gray-900 aurora-tick-up" style={{ animationDelay: "0.95s" }}>
              {revenueFormatted}
            </p>
          </div>
        </div>
        <div className="w-px h-7 bg-gray-100" />
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-purple-50 flex items-center justify-center text-purple-500">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 leading-none mb-0.5">System</p>
            <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              Operational <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
