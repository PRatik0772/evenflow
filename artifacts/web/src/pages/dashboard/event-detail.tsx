import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  useAuthMe, getAuthMeQueryKey,
  useListMyEvents, usePublishEvent, useCancelEvent, getListMyEventsQueryKey,
  useListEventTiers, getListEventTiersQueryKey,
  useCreateEventTier, useUpdateTier, useDeleteTier,
  useListEventOrders, getListEventOrdersQueryKey,
  useCloneEvent, useGetEventTierStats, getGetEventTierStatsQueryKey,
  useListEventStaff, getListEventStaffQueryKey, useAssignEventStaff, useRemoveEventStaff,
  type TicketTier
} from "@workspace/api-client-react";
import { useParams, useLocation, Link } from "wouter";
import { format } from "date-fns";
import {
  ArrowLeft, ExternalLink, Calendar, MapPin, Users, Info,
  Settings, Image as ImageIcon, Loader2, Plus, Edit2, Trash2,
  Ticket, Copy, BarChart3, UserPlus, X, QrCode, Check, Download, Megaphone, Printer
} from "lucide-react";
import { formatAUD } from "@/lib/ics";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PromoCodesTab } from "@/components/PromoCodesTab";
import { AgendaTab } from "@/components/AgendaTab";
import { AnnouncementsTab } from "@/components/AnnouncementsTab";
import { printSingleBadge, printAllBadges } from "@/lib/generateBadgePDF";

const tierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  priceDollars: z.coerce.number().min(0, "Price cannot be negative"),
  quantity: z.coerce.number().min(1, "Must be at least 1").optional().or(z.literal(0).transform(() => undefined)).or(z.nan().transform(() => undefined)),
  saleStartsAt: z.string().optional(),
  saleEndsAt: z.string().optional(),
  sortOrder: z.coerce.number().default(0),
});

type TierFormValues = z.infer<typeof tierSchema>;

const STATUS_COLORS: Record<string, { dot: string; bg: string; text: string }> = {
  published: { dot: "#10B981", bg: "#ECFDF5", text: "#065F46" },
  draft:     { dot: "#F59E0B", bg: "#FFFBEB", text: "#92400E" },
  cancelled: { dot: "#EF4444", bg: "#FEF2F2", text: "#991B1B" },
  completed: { dot: "#6B7280", bg: "#F9FAFB", text: "#374151" },
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.draft;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: c.bg, color: c.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function EventDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id || "";
  const [, setLocation] = useLocation();
  const urlTab = new URLSearchParams(window.location.search).get("tab") ?? "details";
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [tierDialog, setTierDialog] = useState<{
    open: boolean;
    mode: "add" | "edit";
    tier?: TicketTier;
  }>({ open: false, mode: "add" });

  const form = useForm<TierFormValues>({
    resolver: zodResolver(tierSchema),
    defaultValues: { name: "", priceDollars: 0, quantity: undefined, saleStartsAt: "", saleEndsAt: "", sortOrder: 0 },
  });

  const { data: user, isLoading: authLoading } = useAuthMe({ query: { queryKey: getAuthMeQueryKey() } });
  const { data: events, isLoading: eventsLoading } = useListMyEvents({ query: { enabled: !!user && user.role === "organiser", queryKey: getListMyEventsQueryKey() } });
  const { data: tiers = [], isLoading: tiersLoading } = useListEventTiers(id, { query: { queryKey: getListEventTiersQueryKey(id), enabled: !!id } });
  const { data: ordersData, isLoading: ordersLoading } = useListEventOrders(id, { query: { queryKey: getListEventOrdersQueryKey(id), enabled: !!id, refetchInterval: 8000 } });
  const { data: tierStats } = useGetEventTierStats(id, { query: { queryKey: getGetEventTierStatsQueryKey(id), enabled: !!id, refetchInterval: 8000 } });
  const { data: staff = [] } = useListEventStaff(id, { query: { queryKey: getListEventStaffQueryKey(id), enabled: !!id } });

  const publishEvent = usePublishEvent();
  const cancelEvent = useCancelEvent();
  const createTier = useCreateEventTier();
  const updateTier = useUpdateTier();
  const deleteTier = useDeleteTier();
  const cloneEvent = useCloneEvent();
  const assignStaff = useAssignEventStaff();
  const removeStaff = useRemoveEventStaff();

  const [staffEmail, setStaffEmail] = useState("");
  const [attendeeSearch, setAttendeeSearch] = useState("");

  if (authLoading || eventsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-400 rounded-full animate-spin" />
      </div>
    );
  }
  if (!user || user.role !== "organiser") { setLocation("/"); return null; }

  const event = events?.find(e => e.id === id);
  if (!event) {
    return (
      <div className="max-w-lg mx-auto px-6 py-32 text-center">
        <p className="aurora-heading text-3xl text-gray-800 mb-4">Event not found</p>
        <p className="text-gray-400 mb-8">This event may have been deleted or you don't have access.</p>
        <button onClick={() => setLocation("/dashboard")} className="px-6 py-2.5 aurora-gradient text-white text-sm font-medium rounded-full hover:opacity-90 transition-opacity">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const handlePublish = () => publishEvent.mutate({ id }, {
    onSuccess: () => { toast({ title: "Event published" }); queryClient.invalidateQueries({ queryKey: getListMyEventsQueryKey() }); },
    onError: (err) => toast({ title: "Error", description: (err.data as any)?.error || "Failed to publish", variant: "destructive" }),
  });

  const handleCancel = () => cancelEvent.mutate({ id }, {
    onSuccess: () => { toast({ title: "Event cancelled" }); queryClient.invalidateQueries({ queryKey: getListMyEventsQueryKey() }); },
    onError: (err) => toast({ title: "Error", description: (err.data as any)?.error || "Failed to cancel", variant: "destructive" }),
  });

  const handleDeleteTier = (tier: TicketTier) => deleteTier.mutate({ id: tier.id }, {
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListEventTiersQueryKey(event.id) }); toast({ title: "Tier deleted" }); },
    onError: (err) => toast({ title: "Error", description: (err.data as any)?.error || "Failed to delete tier", variant: "destructive" }),
  });

  const handleTierSubmit = (values: TierFormValues) => {
    const priceCents = Math.round(values.priceDollars * 100);
    const data = {
      name: values.name, priceCents,
      quantity: values.quantity || undefined,
      saleStartsAt: values.saleStartsAt ? new Date(values.saleStartsAt).toISOString() : undefined,
      saleEndsAt: values.saleEndsAt ? new Date(values.saleEndsAt).toISOString() : undefined,
      sortOrder: values.sortOrder,
    };
    if (tierDialog.mode === "add") {
      createTier.mutate({ id: event.id, data }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListEventTiersQueryKey(event.id) }); toast({ title: "Tier created" }); setTierDialog({ open: false, mode: "add" }); form.reset(); },
        onError: (err) => toast({ title: "Error", description: (err.data as any)?.error || "Failed", variant: "destructive" }),
      });
    } else if (tierDialog.tier) {
      updateTier.mutate({ id: tierDialog.tier.id, data }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListEventTiersQueryKey(event.id) }); toast({ title: "Tier updated" }); setTierDialog({ open: false, mode: "add" }); form.reset(); },
        onError: (err) => toast({ title: "Error", description: (err.data as any)?.error || "Failed", variant: "destructive" }),
      });
    }
  };

  const openAddTier = () => {
    form.reset({ name: "", priceDollars: 0, quantity: undefined, saleStartsAt: "", saleEndsAt: "", sortOrder: 0 });
    setTierDialog({ open: true, mode: "add" });
  };

  const openEditTier = (tier: TicketTier) => {
    form.reset({
      name: tier.name, priceDollars: tier.priceCents / 100,
      quantity: tier.quantity || undefined,
      saleStartsAt: tier.saleStartsAt ? format(new Date(tier.saleStartsAt), "yyyy-MM-dd'T'HH:mm") : "",
      saleEndsAt: tier.saleEndsAt ? format(new Date(tier.saleEndsAt), "yyyy-MM-dd'T'HH:mm") : "",
      sortOrder: tier.sortOrder,
    });
    setTierDialog({ open: true, mode: "edit", tier });
  };

  const totalRevenue = tierStats?.reduce((s, t) => s + t.revenueCents, 0) ?? 0;
  const totalSold = tierStats?.reduce((s, t) => s + t.sold, 0) ?? 0;

  return (
    <div style={{ background: "#FDFDFC", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-[1280px] mx-auto px-6 py-8">

        {/* ── Page header ── */}
        <div className="mb-8 aurora-fade-in-slide" style={{ animationDelay: "0.05s" }}>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-4"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </Link>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 md:gap-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                <h1 className="aurora-heading text-2xl sm:text-4xl text-gray-900 break-words">{event.title}</h1>
                <StatusBadge status={event.status} />
              </div>
              {event.status === "published" && (
                <a
                  href={`/e/${event.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-500 hover:text-blue-700 transition-colors mt-1"
                >
                  View public page <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                onClick={() => cloneEvent.mutate({ id: event.id }, {
                  onSuccess: (e) => { toast({ title: "Event cloned" }); queryClient.invalidateQueries({ queryKey: getListMyEventsQueryKey() }); setLocation(`/dashboard/events/${e.id}/edit`); },
                  onError: (err) => toast({ title: "Clone failed", description: (err.data as any)?.error || "Try again", variant: "destructive" }),
                })}
                disabled={cloneEvent.isPending}
              >
                {cloneEvent.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                Duplicate
              </button>

              {event.status === "published" && (
                <button
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  onClick={() => setLocation(`/dashboard/events/${event.id}/scan`)}
                >
                  <QrCode className="h-3.5 w-3.5" /> Scan
                </button>
              )}

              <button
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                onClick={() => setLocation(`/dashboard/events/${event.id}/edit`)}
              >
                <Settings className="h-3.5 w-3.5" /> Edit
              </button>

              {event.status === "draft" && (
                <button
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                  onClick={handlePublish}
                  disabled={publishEvent.isPending}
                >
                  {publishEvent.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Publish Event
                </button>
              )}

              {(event.status === "published" || event.status === "draft") && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-red-200 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
                      Cancel Event
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel this event?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will mark the event as cancelled. You'll need to handle any refunds manually.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-full">Go back</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCancel} className="bg-red-500 text-white hover:bg-red-600 rounded-full">
                        Yes, cancel
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">

            {/* Banner */}
            <div
              className="rounded-2xl overflow-hidden border border-gray-100 aurora-fade-in-slide"
              style={{ height: 220, animationDelay: "0.1s" }}
            >
              {event.bannerUrl ? (
                <img src={event.bannerUrl} alt="Event Banner" className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex flex-col items-center justify-center gap-3 cursor-pointer group"
                  style={{ background: "linear-gradient(135deg, rgba(45,212,191,0.08), rgba(59,130,246,0.08), rgba(139,92,246,0.08))" }}
                  onClick={() => setLocation(`/dashboard/events/${event.id}/edit`)}
                >
                  <ImageIcon className="h-10 w-10 text-gray-300 group-hover:text-gray-400 transition-colors" />
                  <span className="text-sm text-gray-400 group-hover:text-gray-600 transition-colors">
                    Click to upload a banner image
                  </span>
                </div>
              )}
            </div>

            {/* Quick stats strip */}
            {tierStats && tierStats.length > 0 && (
              <div
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 aurora-fade-in-slide"
                style={{ animationDelay: "0.15s" }}
              >
                {[
                  { label: "Revenue", value: formatAUD(totalRevenue), icon: <BarChart3 className="w-4 h-4" />, color: "#8B5CF6", bg: "#F5F3FF" },
                  { label: "Tickets Sold", value: String(totalSold), icon: <Ticket className="w-4 h-4" />, color: "#3B82F6", bg: "#EFF6FF" },
                  { label: "Checked In", value: String(tierStats.reduce((s, t) => s + t.checkedIn, 0)), icon: <Check className="w-4 h-4" />, color: "#10B981", bg: "#ECFDF5" },
                ].map(card => (
                  <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-4">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: card.bg, color: card.color }}>
                      {card.icon}
                    </div>
                    <p className="aurora-heading text-2xl text-gray-900">{card.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{card.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tabs */}
            <Tabs value={urlTab} className="aurora-fade-in-slide" style={{ animationDelay: "0.2s" }}>
              <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 mb-6">
                <TabsList className="aurora-chip-track h-auto p-1 bg-gray-100 w-max inline-flex rounded-full border-0">
                  {["details", "tickets", "attendees", "staff", "promos", "agenda", "announcements"].map(v => (
                    <TabsTrigger
                      key={v}
                      value={v}
                      className="aurora-chip rounded-full px-3 sm:px-4 py-1.5 text-sm font-medium capitalize data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 border-0 transition-all whitespace-nowrap"
                    >
                      {v === "tickets" ? "Tickets & Pricing" : v === "promos" ? "Promo Codes" : v === "announcements" ? "Announcements" : v.charAt(0).toUpperCase() + v.slice(1)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {/* Details tab */}
              <TabsContent value="details">
                <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                    <Info className="h-4 w-4" /> Event Description
                  </h2>
                  <div className="text-gray-600 leading-relaxed whitespace-pre-wrap text-base">
                    {event.description || "No description provided."}
                  </div>
                </div>
              </TabsContent>

              {/* Tickets tab */}
              <TabsContent value="tickets" className="space-y-4">
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <Ticket className="h-4 w-4" /> Ticket Tiers
                    </h2>
                    <button
                      onClick={openAddTier}
                      className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 aurora-gradient text-white rounded-full hover:opacity-90 transition-opacity"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Tier
                    </button>
                  </div>
                  {tiersLoading ? (
                    <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-gray-300" /></div>
                  ) : tiers.length === 0 ? (
                    <div className="text-center p-12 text-gray-400 text-sm">
                      No ticket tiers yet — add one to start selling.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-gray-50 hover:bg-transparent">
                            <TableHead className="text-xs font-semibold text-gray-400 uppercase tracking-wider py-3">Name</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-400 uppercase tracking-wider py-3">Price</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-400 uppercase tracking-wider py-3">Capacity</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-400 uppercase tracking-wider py-3">Sold</TableHead>
                            <TableHead className="text-right py-3" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tiers.sort((a, b) => a.sortOrder - b.sortOrder).map(tier => (
                            <TableRow key={tier.id} className="border-gray-50 hover:bg-gray-50/50">
                              <TableCell className="font-semibold text-gray-800 py-4">{tier.name}</TableCell>
                              <TableCell className="text-gray-600 py-4">{tier.priceCents === 0 ? "Free" : `$${(tier.priceCents / 100).toFixed(2)}`}</TableCell>
                              <TableCell className="text-gray-500 py-4">{tier.quantity ?? "Unlimited"}</TableCell>
                              <TableCell className="text-gray-600 py-4">{tier.sold}</TableCell>
                              <TableCell className="text-right py-4">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    className="p-1.5 text-gray-300 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                                    onClick={() => openEditTier(tier)}
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  {tier.sold === 0 && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <button className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent className="rounded-2xl">
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete Ticket Tier?</AlertDialogTitle>
                                          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                                          <AlertDialogAction className="bg-red-500 text-white hover:bg-red-600 rounded-full" onClick={() => handleDeleteTier(tier)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                <Dialog open={tierDialog.open} onOpenChange={(open) => setTierDialog(prev => ({ ...prev, open }))}>
                  <DialogContent className="rounded-2xl sm:max-w-[480px]">
                    <DialogHeader className="mb-2">
                      <DialogTitle className="aurora-heading text-2xl">
                        {tierDialog.mode === "add" ? "Add Ticket Tier" : "Edit Ticket Tier"}
                      </DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(handleTierSubmit)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Tier Name</FormLabel>
                            <FormControl><Input placeholder="e.g. General Admission" className="rounded-xl h-11" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="priceDollars" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Price (AUD)</FormLabel>
                              <FormControl><Input type="number" step="0.01" min="0" className="rounded-xl h-11" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="quantity" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Capacity</FormLabel>
                              <FormControl><Input type="number" min="1" placeholder="Unlimited" className="rounded-xl h-11" {...field} value={field.value ?? ""} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="saleStartsAt" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Sale opens</FormLabel>
                              <FormControl><Input type="datetime-local" className="rounded-xl h-11" {...field} value={field.value || ""} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="saleEndsAt" render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Sale closes</FormLabel>
                              <FormControl><Input type="datetime-local" className="rounded-xl h-11" {...field} value={field.value || ""} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <FormField control={form.control} name="sortOrder" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Sort order</FormLabel>
                            <FormControl><Input type="number" className="rounded-xl h-11" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <DialogFooter className="mt-6 gap-2">
                          <Button type="button" variant="outline" className="rounded-full h-10 px-6" onClick={() => setTierDialog({ open: false, mode: "add" })}>Cancel</Button>
                          <Button type="submit" className="rounded-full h-10 px-6 aurora-gradient border-0 text-white font-medium hover:opacity-90" disabled={createTier.isPending || updateTier.isPending}>
                            {(createTier.isPending || updateTier.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Tier
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </TabsContent>

              {/* Attendees tab */}
              <TabsContent value="attendees" className="space-y-5">
                {tierStats && tierStats.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-50">
                      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" /> Sales by tier
                      </h2>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-gray-50 hover:bg-transparent">
                            <TableHead className="text-xs font-semibold text-gray-400 uppercase tracking-wider py-3">Tier</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-400 uppercase tracking-wider py-3">Sold</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-400 uppercase tracking-wider py-3">Checked in</TableHead>
                            <TableHead className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider py-3">Revenue</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tierStats.map(t => (
                            <TableRow key={t.tierId} className="border-gray-50">
                              <TableCell className="font-semibold text-gray-800 py-4">{t.name}</TableCell>
                              <TableCell className="text-gray-600 py-4">{t.sold}{t.quantity ? ` / ${t.quantity}` : ""}</TableCell>
                              <TableCell className="text-gray-600 py-4">{t.checkedIn}</TableCell>
                              <TableCell className="text-right font-semibold py-4 aurora-gradient-text">{formatAUD(t.revenueCents)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-50 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <Users className="h-4 w-4" /> Attendee list
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      <Input
                        placeholder="Search attendees…"
                        value={attendeeSearch}
                        onChange={(e) => setAttendeeSearch(e.target.value)}
                        className="rounded-full h-9 w-52 max-w-full text-sm border-gray-200"
                      />
                      <button
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        onClick={async () => {
                          if (!ordersData) return;
                          const tickets = ordersData.orders
                            .filter(o => o.status === "paid")
                            .flatMap(o => o.tickets.map(t => ({
                              attendeeName: t.attendeeName,
                              attendeeEmail: t.attendeeEmail,
                              tierName: t.tierName,
                              qrToken: t.qrToken,
                            })));
                          await printAllBadges(tickets, {
                            title: event.title,
                            startAt: event.startAt,
                            venueName: event.venueName,
                            virtualUrl: event.virtualUrl,
                          });
                        }}
                      >
                        <Printer className="h-3.5 w-3.5" /> Print All Badges
                      </button>
                      <button
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        onClick={() => {
                          if (!ordersData) return;
                          const rows = [["Attendee", "Email", "Tier", "Buyer", "Buyer email", "Order date", "Checked in"]];
                          for (const o of ordersData.orders.filter((o) => o.status === "paid")) {
                            for (const t of o.tickets) {
                              rows.push([t.attendeeName, t.attendeeEmail, t.tierName, o.buyerName, o.buyerEmail, new Date(o.createdAt).toISOString(), t.checkedInAt ? "Yes" : "No"]);
                            }
                          }
                          const csv = rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
                          const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url; a.download = `${event.slug}-attendees.csv`;
                          document.body.appendChild(a); a.click(); document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                      >
                        <Download className="h-3.5 w-3.5" /> CSV
                      </button>
                    </div>
                  </div>
                  {ordersLoading ? (
                    <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-200" /></div>
                  ) : !ordersData || ordersData.orders.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 text-sm">No tickets sold yet.</div>
                  ) : (
                    <>
                      <div className="px-6 py-3 border-b border-gray-50 flex gap-4 text-xs font-medium text-gray-500">
                        <span>{ordersData.stats.paidOrders} confirmed orders</span>
                        <span className="text-gray-200">|</span>
                        <span>{ordersData.stats.totalTickets} total attendees</span>
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-gray-50 hover:bg-transparent">
                              <TableHead className="text-xs font-semibold text-gray-400 uppercase tracking-wider py-3">Attendee</TableHead>
                              <TableHead className="text-xs font-semibold text-gray-400 uppercase tracking-wider py-3">Tier</TableHead>
                              <TableHead className="text-xs font-semibold text-gray-400 uppercase tracking-wider py-3">Status</TableHead>
                              <TableHead className="text-right py-3" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {ordersData.orders
                              .flatMap(order => order.tickets.map(t => ({ order, ticket: t })))
                              .filter(({ order, ticket }) => {
                                const q = attendeeSearch.trim().toLowerCase();
                                if (!q) return true;
                                return ticket.attendeeName.toLowerCase().includes(q) || ticket.attendeeEmail.toLowerCase().includes(q) || ticket.tierName.toLowerCase().includes(q) || order.buyerEmail.toLowerCase().includes(q);
                              })
                              .map(({ order, ticket }) => (
                                <TableRow key={ticket.id} className="border-gray-50 hover:bg-gray-50/50">
                                  <TableCell className="py-4">
                                    <div className="font-semibold text-gray-800 text-sm">{ticket.attendeeName}</div>
                                    <div className="text-xs text-gray-400">{ticket.attendeeEmail}</div>
                                  </TableCell>
                                  <TableCell className="py-4">
                                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">{ticket.tierName}</span>
                                  </TableCell>
                                  <TableCell className="py-4">
                                    {ticket.checkedInAt ? (
                                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                                        <Check className="h-3 w-3" /> Checked in
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                                        Not yet
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right py-4">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        className="text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors inline-flex items-center gap-1"
                                        title="Print badge"
                                        onClick={() => void printSingleBadge(
                                          { attendeeName: ticket.attendeeName, attendeeEmail: ticket.attendeeEmail, tierName: ticket.tierName, qrToken: ticket.qrToken },
                                          { title: event.title, startAt: event.startAt, venueName: event.venueName, virtualUrl: event.virtualUrl }
                                        )}
                                      >
                                        <Printer className="h-3 w-3" /> Badge
                                      </button>
                                      <button
                                        className="text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                                        onClick={async () => {
                                          const path = ticket.checkedInAt
                                            ? `/api/tickets/${ticket.qrToken}/uncheckin`
                                            : `/api/tickets/${ticket.qrToken}/checkin`;
                                          const res = await fetch(path, { method: "POST", credentials: "include" });
                                          if (res.ok) {
                                            toast({ title: ticket.checkedInAt ? "Check-in reverted" : "Checked in" });
                                            queryClient.invalidateQueries({ queryKey: getListEventOrdersQueryKey(event.id) });
                                            queryClient.invalidateQueries({ queryKey: getGetEventTierStatsQueryKey(event.id) });
                                          } else {
                                            const d = await res.json().catch(() => ({}));
                                            toast({ title: "Failed", description: d.error || "Try again", variant: "destructive" });
                                          }
                                        }}
                                      >
                                        {ticket.checkedInAt ? "Undo" : "Check in"}
                                      </button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>

              {/* Staff tab */}
              <TabsContent value="staff">
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-50">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <UserPlus className="h-4 w-4" /> Scanning Staff
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">Add people to help scan tickets at the door — they need an existing EventFlow account.</p>
                  </div>
                  <div className="px-6 py-5 border-b border-gray-50 flex gap-3">
                    <Input
                      placeholder="staff@example.com"
                      type="email"
                      value={staffEmail}
                      onChange={(e) => setStaffEmail(e.target.value)}
                      className="rounded-full h-10 text-sm border-gray-200"
                    />
                    <button
                      className="inline-flex items-center gap-1.5 px-5 py-2 aurora-gradient text-white text-sm font-medium rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
                      disabled={!staffEmail.trim() || assignStaff.isPending}
                      onClick={() => {
                        assignStaff.mutate({ id: event.id, data: { email: staffEmail.trim() } }, {
                          onSuccess: () => { toast({ title: "Staff added" }); setStaffEmail(""); queryClient.invalidateQueries({ queryKey: getListEventStaffQueryKey(event.id) }); },
                          onError: (err) => toast({ title: "Could not add", description: (err.data as any)?.error || "Try again", variant: "destructive" }),
                        });
                      }}
                    >
                      {assignStaff.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Add
                    </button>
                  </div>
                  {staff.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 text-sm">No staff yet — add someone above.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-50 hover:bg-transparent">
                          <TableHead className="text-xs font-semibold text-gray-400 uppercase tracking-wider py-3">Name</TableHead>
                          <TableHead className="text-xs font-semibold text-gray-400 uppercase tracking-wider py-3">Email</TableHead>
                          <TableHead className="text-right py-3" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {staff.map(s => (
                          <TableRow key={s.userId} className="border-gray-50 hover:bg-gray-50/50">
                            <TableCell className="font-semibold text-gray-800 py-4">{s.name}</TableCell>
                            <TableCell className="text-gray-500 py-4">{s.email}</TableCell>
                            <TableCell className="text-right py-4">
                              <button
                                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                onClick={() => removeStaff.mutate({ id: event.id, userId: s.userId }, {
                                  onSuccess: () => { toast({ title: "Staff removed" }); queryClient.invalidateQueries({ queryKey: getListEventStaffQueryKey(event.id) }); },
                                })}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </TabsContent>

              {/* Promo Codes tab */}
              <TabsContent value="promos" className="space-y-4">
                <PromoCodesTab eventId={event.id} />
              </TabsContent>

              <TabsContent value="agenda">
                <AgendaTab eventId={event.id} />
              </TabsContent>

              <TabsContent value="announcements">
                <AnnouncementsTab eventId={event.id} eventTitle={event.title} />
              </TabsContent>
            </Tabs>
          </div>

          {/* ── Right sidebar ── */}
          <div className="lg:col-span-4">
            <div
              className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-20 aurora-fade-in-slide"
              style={{ animationDelay: "0.25s" }}
            >
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-6">Event Information</h3>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-1">Date & Time</p>
                    <p className="font-semibold text-gray-800 text-sm">{format(new Date(event.startAt), "MMM d, yyyy")}</p>
                    {event.endAt && format(new Date(event.startAt), "MMM d") !== format(new Date(event.endAt), "MMM d") && (
                      <p className="text-sm text-gray-500">to {format(new Date(event.endAt), "MMM d, yyyy")}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-0.5">
                      {format(new Date(event.startAt), "h:mm a")}
                      {event.endAt && ` – ${format(new Date(event.endAt), "h:mm a")}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-1">Location</p>
                    {event.virtualUrl ? (
                      <>
                        <p className="font-semibold text-gray-800 text-sm">Online Event</p>
                        <a href={event.virtualUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline break-all mt-1 inline-block">{event.virtualUrl}</a>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-gray-800 text-sm">{event.venueName}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{event.venueAddress}</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500 shrink-0">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-1">Organiser</p>
                    <p className="font-semibold text-gray-800 text-sm">{event.organiserName}</p>
                  </div>
                </div>

                {event.capacity && (
                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                      <Ticket className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-400 mb-1">Capacity</p>
                      <p className="font-semibold text-gray-800 text-sm">{event.capacity.toLocaleString()} total</p>
                    </div>
                  </div>
                )}
              </div>

              {event.status === "draft" && (
                <div className="mt-6 pt-6 border-t border-gray-50">
                  <button
                    className="w-full py-2.5 aurora-gradient text-white text-sm font-medium rounded-full hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                    onClick={handlePublish}
                    disabled={publishEvent.isPending}
                  >
                    {publishEvent.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Publish Event
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
