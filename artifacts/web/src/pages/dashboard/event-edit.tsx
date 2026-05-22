import { useState, useEffect, useRef } from "react";
import { useAuthMe, getAuthMeQueryKey, useListMyEvents, useUpdateEvent, getListMyEventsQueryKey } from "@workspace/api-client-react";
import { useLocation, useParams, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, CalendarIcon, MapPin, Link as LinkIcon, Loader2, Upload, ImageIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().optional(),
  category: z.string().optional(),
  startAt: z.string().min(1, "Start time is required"),
  endAt: z.string().min(1, "End time is required"),
  venueName: z.string().optional(),
  venueAddress: z.string().optional(),
  virtualUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  capacity: z.coerce.number().min(1).optional().or(z.literal("").transform(() => undefined)),
}).refine(data => new Date(data.endAt) > new Date(data.startAt), {
  message: "End time must be after start time",
  path: ["endAt"],
});

type FormValues = z.infer<typeof formSchema>;

export default function EventEdit() {
  const params = useParams<{ id: string }>();
  const id = params.id || "";
  const [, setLocation] = useLocation();
  const { data: user, isLoading: authLoading } = useAuthMe({ query: { queryKey: getAuthMeQueryKey() } });
  const { data: events, isLoading: eventsLoading } = useListMyEvents({ query: { enabled: !!user && user.role === "organiser", queryKey: getListMyEventsQueryKey() } });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateEvent = useUpdateEvent();

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const event = events?.find(e => e.id === id);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", description: "", category: "", startAt: "", endAt: "", venueName: "", venueAddress: "", virtualUrl: "", capacity: undefined },
  });

  useEffect(() => {
    if (event) {
      const fmt = (iso: string) => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
      form.reset({
        title: event.title, description: event.description || "", category: event.category || "",
        startAt: event.startAt ? fmt(event.startAt) : "",
        endAt: event.endAt ? fmt(event.endAt) : "",
        venueName: event.venueName || "", venueAddress: event.venueAddress || "",
        virtualUrl: event.virtualUrl || "", capacity: event.capacity || undefined,
      });
    }
  }, [event, form]);

  if (authLoading || eventsLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-400 rounded-full animate-spin" />
    </div>
  );
  if (!user || user.role !== "organiser") { setLocation("/"); return null; }
  if (!event) return <div className="p-8 text-center text-gray-400">Event not found</div>;

  const onSubmit = (data: FormValues) => {
    updateEvent.mutate({ id, data }, {
      onSuccess: () => {
        toast({ title: "Event updated", description: "Your changes have been saved." });
        queryClient.invalidateQueries({ queryKey: getListMyEventsQueryKey() });
        setLocation(`/dashboard/events/${id}`);
      },
      onError: (error) => {
        toast({ title: "Error", description: (error.data as any)?.error || "Failed to update event", variant: "destructive" });
      }
    });
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("banner", file);
    try {
      const res = await fetch(`/api/events/${id}/banner`, { method: "POST", credentials: "include", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      toast({ title: "Banner uploaded" });
      queryClient.invalidateQueries({ queryKey: getListMyEventsQueryKey() });
    } catch {
      toast({ title: "Upload failed", description: "Could not upload banner image.", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div style={{ background: "#FDFDFC", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8 aurora-fade-in-slide" style={{ animationDelay: "0.05s" }}>
          <Link href={`/dashboard/events/${id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-5">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Event
          </Link>
          <h1 className="aurora-heading text-4xl text-gray-900 mb-1">Edit event</h1>
          <p className="text-sm text-gray-400">Changes are saved as a draft and don't affect published tickets.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Form — left 2/3 */}
          <div className="md:col-span-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                {/* Basic Info */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5 aurora-fade-in-slide" style={{ animationDelay: "0.1s" }}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Basic Info</p>

                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Event Title *</FormLabel>
                      <FormControl><Input placeholder="e.g. Summer Music Festival 2025" className="rounded-xl h-11 border-gray-200" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="category" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Category</FormLabel>
                        <FormControl><Input placeholder="e.g. Music, Workshop, Tech" className="rounded-xl h-11 border-gray-200" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="capacity" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Capacity</FormLabel>
                        <FormControl><Input type="number" placeholder="Max attendees (optional)" className="rounded-xl h-11 border-gray-200" {...field} value={field.value || ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Description</FormLabel>
                      <FormControl><Textarea placeholder="Tell people what your event is about…" className="min-h-[120px] resize-y rounded-xl border-gray-200" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Date & Time */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5 aurora-fade-in-slide" style={{ animationDelay: "0.15s" }}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <CalendarIcon className="h-3.5 w-3.5" /> Date & Time
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="startAt" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Start Time *</FormLabel>
                        <FormControl><Input type="datetime-local" className="rounded-xl h-11 border-gray-200" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="endAt" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">End Time *</FormLabel>
                        <FormControl><Input type="datetime-local" className="rounded-xl h-11 border-gray-200" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                {/* Location */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5 aurora-fade-in-slide" style={{ animationDelay: "0.2s" }}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" /> Location
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="venueName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Venue Name</FormLabel>
                        <FormControl><Input placeholder="e.g. Sydney Opera House" className="rounded-xl h-11 border-gray-200" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="venueAddress" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Address</FormLabel>
                        <FormControl><Input placeholder="Full street address" className="rounded-xl h-11 border-gray-200" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="virtualUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                        <LinkIcon className="h-3.5 w-3.5 text-gray-400" /> Virtual URL (online events)
                      </FormLabel>
                      <FormControl><Input placeholder="https://zoom.us/j/…" className="rounded-xl h-11 border-gray-200" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="flex justify-end gap-3 aurora-fade-in-slide" style={{ animationDelay: "0.25s" }}>
                  <button type="button" className="px-6 py-2.5 rounded-full border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors" onClick={() => setLocation(`/dashboard/events/${id}`)}>
                    Cancel
                  </button>
                  <button type="submit" disabled={updateEvent.isPending} className="px-6 py-2.5 rounded-full aurora-gradient text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2">
                    {updateEvent.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </Form>
          </div>

          {/* Banner sidebar */}
          <div className="aurora-fade-in-slide" style={{ animationDelay: "0.12s" }}>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-20">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Event Banner</p>
              <div
                className="aspect-video rounded-xl overflow-hidden border border-dashed border-gray-200 flex items-center justify-center relative group mb-4 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {event.bannerUrl ? (
                  <>
                    <img src={event.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                      <span className="text-white text-xs font-medium">Change image</span>
                    </div>
                  </>
                ) : (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-300 group-hover:text-gray-400 transition-colors"
                    style={{ background: "linear-gradient(135deg, rgba(45,212,191,0.05), rgba(139,92,246,0.05))" }}
                  >
                    <ImageIcon className="h-7 w-7" />
                    <span className="text-xs">16:9 recommended</span>
                  </div>
                )}
              </div>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" ref={fileInputRef} onChange={handleBannerUpload} />
              <button
                type="button"
                className="w-full py-2.5 rounded-full border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {isUploading ? "Uploading…" : event.bannerUrl ? "Replace Image" : "Upload Image"}
              </button>
              <p className="text-xs text-gray-400 text-center mt-3">JPG, PNG, or WebP · max 5 MB</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
