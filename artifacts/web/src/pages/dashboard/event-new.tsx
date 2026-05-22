import { useAuthMe, getAuthMeQueryKey, useCreateEvent, getListMyEventsQueryKey } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, MapPin, Link as LinkIcon, Loader2, ArrowLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 pb-4 mb-2 border-b border-gray-100">
      <div className="w-8 h-8 rounded-xl aurora-gradient flex items-center justify-center text-white shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function EventNew() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading: authLoading } = useAuthMe({ query: { queryKey: getAuthMeQueryKey() } });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createEvent = useCreateEvent();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", description: "", category: "", startAt: "", endAt: "", venueName: "", venueAddress: "", virtualUrl: "", capacity: undefined },
  });

  if (authLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-400 rounded-full animate-spin" />
    </div>
  );
  if (!user || user.role !== "organiser") { setLocation("/"); return null; }

  const onSubmit = (data: FormValues) => {
    createEvent.mutate({ data }, {
      onSuccess: (newEvent) => {
        toast({ title: "Event created", description: "Your event has been saved as a draft." });
        queryClient.invalidateQueries({ queryKey: getListMyEventsQueryKey() });
        setLocation(`/dashboard/events/${newEvent.id}`);
      },
      onError: (error) => {
        toast({ title: "Error", description: (error.data as any)?.error || "Failed to create event", variant: "destructive" });
      }
    });
  };

  return (
    <div style={{ background: "#FDFDFC", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8 aurora-fade-in-slide" style={{ animationDelay: "0.05s" }}>
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-5">
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </Link>
          <h1 className="aurora-heading text-4xl text-gray-900 mb-1">Create new event</h1>
          <p className="text-sm text-gray-400">Fill in the details below — you can always edit later.</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

            {/* Basic Info */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5 aurora-fade-in-slide" style={{ animationDelay: "0.1s" }}>
              <SectionHeader icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>} title="Basic Info" />

              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Event Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Summer Music Festival 2025" className="rounded-xl h-11 border-gray-200 focus:border-blue-400" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Category</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Music, Workshop, Tech" className="rounded-xl h-11 border-gray-200" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="capacity" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Capacity</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Max attendees (optional)" className="rounded-xl h-11 border-gray-200" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Tell people what your event is about…" className="min-h-[120px] resize-y rounded-xl border-gray-200" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Date & Time */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5 aurora-fade-in-slide" style={{ animationDelay: "0.15s" }}>
              <SectionHeader icon={<CalendarIcon className="w-4 h-4" />} title="Date & Time" />
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
              <SectionHeader icon={<MapPin className="w-4 h-4" />} title="Location" subtitle="Physical address or an online link — pick one." />
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
                  <FormLabel className="text-sm font-medium text-gray-700 flex items-center gap-1.5"><LinkIcon className="h-3.5 w-3.5 text-gray-400" /> Virtual URL (for online events)</FormLabel>
                  <FormControl><Input placeholder="https://zoom.us/j/…" className="rounded-xl h-11 border-gray-200" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 aurora-fade-in-slide" style={{ animationDelay: "0.25s" }}>
              <button
                type="button"
                className="px-6 py-2.5 rounded-full border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                onClick={() => setLocation("/dashboard")}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createEvent.isPending}
                className="px-6 py-2.5 rounded-full aurora-gradient text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
              >
                {createEvent.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Create Draft Event
              </button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
