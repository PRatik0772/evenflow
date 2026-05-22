import { useState } from "react";
import { Link } from "wouter";
import { useListEvents, getListEventsQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Calendar, MapPin, Search, ArrowRight, SlidersHorizontal } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

const CATEGORIES = ["All", "Music", "Business", "Food & Drink", "Arts", "Sports", "Technology", "Health"];
const PRICE_FILTERS: Array<{ key: "any" | "free" | "paid"; label: string }> = [
  { key: "any", label: "All" },
  { key: "free", label: "Free" },
  { key: "paid", label: "Paid" },
];
const SORT_OPTIONS: Array<{ key: "startAt" | "createdAt"; label: string }> = [
  { key: "startAt", label: "Soonest" },
  { key: "createdAt", label: "New" },
];

export default function Home() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [category, setCategory] = useState("All");
  const [priceFilter, setPriceFilter] = useState<"any" | "free" | "paid">("any");
  const [sortBy, setSortBy] = useState<"startAt" | "createdAt">("startAt");

  const queryParams = {
    q: debouncedSearch || undefined,
    category: category !== "All" ? category : undefined,
    ...(priceFilter !== "any" ? { priceFilter } : {}),
    ...(sortBy !== "startAt" ? { sortBy } : {}),
  } as Record<string, string | undefined>;

  const { data: events, isLoading } = useListEvents(queryParams as any, {
    query: { queryKey: getListEventsQueryKey(queryParams as any) }
  });

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Hero ── */}
      <section className="bg-[#0D0D0D] px-6 pt-16 pb-14">
        <div className="max-w-5xl mx-auto">
          <div className="mb-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/40 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Australia · Live events
            </span>
          </div>
          <h1
            className="text-white font-black leading-none mb-8"
            style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)", letterSpacing: "-0.03em" }}
          >
            Events<br />
            <span style={{ WebkitTextStroke: "2px rgba(255,255,255,0.25)", color: "transparent" }}>
              happening
            </span>
            <br />
            near you.
          </h1>

          {/* Search bar */}
          <div className="flex items-center bg-white rounded-2xl h-14 px-2 gap-2 max-w-2xl">
            <Search className="h-5 w-5 text-gray-400 ml-3 shrink-0" />
            <input
              placeholder="Search events, artists, venues…"
              className="flex-1 bg-transparent text-gray-900 text-base placeholder:text-gray-400 focus:outline-none h-full"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button className="bg-black text-white rounded-xl px-5 h-10 text-sm font-bold shrink-0 hover:bg-gray-900 transition-colors">
              Search
            </button>
          </div>

          {/* Stats strip */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-8 mt-8">
            {[
              { n: "500+", label: "Events" },
              { n: "50k+", label: "Attendees" },
              { n: "100+", label: "Organisers" },
            ].map((s, i) => (
              <div key={i} className={`flex items-center gap-2 sm:gap-3 ${i > 0 ? "sm:border-l sm:border-white/10 sm:pl-8" : ""}`}>
                <span className="text-xl sm:text-2xl font-black text-white">{s.n}</span>
                <span className="text-white/30 text-xs font-medium uppercase tracking-widest">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Category rail ── */}
      <div className="sticky top-16 z-40 bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all border ${
                  category === cat
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-900"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <section className="max-w-5xl mx-auto px-6 py-10">

        {/* Filter + sort bar */}
        <div className="flex items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5 text-gray-400" />
            <div className="flex items-center gap-1.5">
              {PRICE_FILTERS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setPriceFilter(p.key)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    priceFilter === p.key ? "bg-black text-white border-black" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <div className="flex items-center gap-1.5">
              {SORT_OPTIONS.map(s => (
                <button
                  key={s.key}
                  onClick={() => setSortBy(s.key)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    sortBy === s.key ? "bg-black text-white border-black" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {events && !isLoading && (
            <span className="text-xs font-semibold text-gray-400 shrink-0">
              {events.length} {events.length === 1 ? "event" : "events"}
            </span>
          )}
        </div>

        {/* Events grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="rounded-2xl overflow-hidden bg-white border border-gray-100">
                <div className="h-44 bg-gray-100 animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-gray-100 rounded-full w-1/4 animate-pulse" />
                  <div className="h-4 bg-gray-100 rounded-full w-3/4 animate-pulse" />
                  <div className="h-3 bg-gray-100 rounded-full w-1/2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : events && events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((event, i) => (
              <Link
                key={event.id}
                href={`/e/${event.slug}`}
                className="block group"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-300 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">

                  {/* Image */}
                  <div className="relative h-44 bg-gray-100 overflow-hidden">
                    {event.bannerUrl ? (
                      <img
                        src={event.bannerUrl}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#0D0D0D] flex items-center justify-center">
                        <Calendar className="h-10 w-10 text-white/10" />
                      </div>
                    )}

                    {/* Date badge */}
                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm rounded-xl px-2.5 py-1.5 text-center shadow-sm">
                      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 leading-none">
                        {format(new Date(event.startAt), "MMM")}
                      </div>
                      <div className="text-base font-black text-gray-900 leading-none mt-0.5">
                        {format(new Date(event.startAt), "d")}
                      </div>
                    </div>

                    {event.category && (
                      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg">
                        {event.category}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 leading-snug line-clamp-2 mb-2 text-sm group-hover:text-black transition-colors">
                      {event.title}
                    </h3>

                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="line-clamp-1">
                        {event.virtualUrl ? "Online Event" : event.venueName || "Location TBA"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                      <span className="text-xs text-gray-400">
                        {format(new Date(event.startAt), "h:mm a")}
                      </span>
                      <span className="text-xs font-bold text-gray-900 flex items-center gap-1 group-hover:gap-1.5 transition-all">
                        Get Tickets <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 border border-dashed border-gray-200 rounded-2xl">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-7 w-7 text-gray-300" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">No events found</h3>
            <p className="text-sm text-gray-400 max-w-xs mx-auto mb-6">
              Try adjusting your filters or check back later.
            </p>
            <button
              className="px-6 py-2.5 bg-black text-white text-sm font-semibold rounded-full hover:bg-gray-900 transition-colors"
              onClick={() => { setSearch(""); setCategory("All"); setPriceFilter("any"); setSortBy("startAt"); }}
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
