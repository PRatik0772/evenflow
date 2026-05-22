import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useLocation, Link } from "wouter";
import {
  useAuthMe, getAuthMeQueryKey,
  useListMyEvents, getListMyEventsQueryKey,
  useListMyStaffEvents, getListMyStaffEventsQueryKey,
  useGetEventTierStats, getGetEventTierStatsQueryKey,
} from "@workspace/api-client-react";
import { ArrowLeft, QrCode, CheckCircle2, XCircle, Loader2, Camera, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type ScanResult = {
  success: boolean;
  error?: string;
  attendeeName?: string;
  tierName?: string;
  checkedInAt?: string;
  alreadyCheckedIn?: boolean;
};

async function checkinByToken(qrToken: string): Promise<ScanResult> {
  const res = await fetch(`/api/tickets/${encodeURIComponent(qrToken)}/checkin`, { method: "POST", credentials: "include" });
  const data = await res.json();
  if (res.ok) return { success: true, attendeeName: data.ticket?.attendeeName, tierName: data.ticket?.tierName, checkedInAt: data.checkedInAt };
  if (res.status === 400 && data.error?.includes("Already checked in")) return { success: false, alreadyCheckedIn: true, error: data.error };
  return { success: false, error: data.error ?? "Check-in failed" };
}

export default function ScanPage() {
  const params = useParams<{ id: string }>();
  const id = params.id || "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: user, isLoading: authLoading } = useAuthMe({ query: { queryKey: getAuthMeQueryKey() } });
  const isOrganiser = user?.role === "organiser" || user?.role === "admin";
  const isStaff = user?.role === "staff";
  const { data: organiserEvents, isLoading: organiserLoading } = useListMyEvents({ query: { enabled: isOrganiser, queryKey: getListMyEventsQueryKey() } });
  const { data: staffEvents, isLoading: staffLoading } = useListMyStaffEvents({ query: { enabled: isStaff, queryKey: getListMyStaffEventsQueryKey() } });
  const eventsLoading = organiserLoading || staffLoading;
  const events = isStaff ? staffEvents : organiserEvents;
  const event = events?.find(e => e.id === id);

  const { data: tierStats } = useGetEventTierStats(id, {
    query: { queryKey: getGetEventTierStatsQueryKey(id), enabled: !!id, refetchInterval: 3000 }
  });
  const totalCheckedIn = tierStats?.reduce((s, t) => s + t.checkedIn, 0) ?? 0;
  const totalSold = tierStats?.reduce((s, t) => s + t.sold, 0) ?? 0;
  const checkinPct = totalSold > 0 ? Math.round((totalCheckedIn / totalSold) * 100) : 0;

  const [manualToken, setManualToken] = useState("");
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [processedTokens] = useState(() => new Set<string>());
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const handleToken = useCallback(async (token: string) => {
    const clean = token.trim();
    if (!clean || processedTokens.has(clean)) return;
    processedTokens.add(clean);
    setLastResult(null);
    const result = await checkinByToken(clean);
    setLastResult(result);
    if (result.success) toast({ title: `Checked in: ${result.attendeeName}`, description: result.tierName });
    else if (result.alreadyCheckedIn) toast({ title: "Already checked in", description: result.error, variant: "destructive" });
    else { toast({ title: "Check-in failed", description: result.error, variant: "destructive" }); processedTokens.delete(clean); }
    setTimeout(() => setLastResult(null), 5000);
  }, [processedTokens, toast]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      setScanning(true);
    } catch {
      setCameraError("Camera access denied. Use manual entry below instead.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    cancelAnimationFrame(animFrameRef.current);
    setScanning(false);
  }, []);

  useEffect(() => {
    if (!scanning) return;
    let active = true;
    const tick = async () => {
      if (!active) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        try {
          const jsQR = (await import("jsqr")).default;
          const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
          if (code?.data) await handleToken(code.data);
        } catch { /* jsQR not available */ }
      }
      if (active) animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => { active = false; cancelAnimationFrame(animFrameRef.current); };
  }, [scanning, handleToken]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  if (authLoading || eventsLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-400 rounded-full animate-spin" />
    </div>
  );
  if (!user || (!isOrganiser && !isStaff)) { setLocation("/"); return null; }
  if (!event) return (
    <div className="max-w-md mx-auto px-6 py-24 text-center">
      <p className="aurora-heading text-2xl text-gray-800 mb-4">Event not found</p>
      <button onClick={() => setLocation("/dashboard")} className="px-6 py-2.5 aurora-gradient text-white text-sm font-medium rounded-full hover:opacity-90 transition-opacity">
        Back to Dashboard
      </button>
    </div>
  );

  return (
    <div style={{ background: "#FDFDFC", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-lg mx-auto px-5 py-8 pb-24">

        {/* Header */}
        <div className="mb-6 aurora-fade-in-slide" style={{ animationDelay: "0.05s" }}>
          <Link href={`/dashboard/events/${id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-4">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Event
          </Link>
          <h1 className="aurora-heading text-3xl text-gray-900 mb-0.5">Door Check-In</h1>
          <p className="text-sm text-gray-500">{event.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{format(new Date(event.startAt), "EEE d MMM yyyy 'at' h:mm a")}</p>
        </div>

        {/* Live counter */}
        <div
          className="rounded-2xl p-5 mb-5 flex items-center justify-between aurora-fade-in-slide"
          style={{
            background: "linear-gradient(135deg, #2DD4BF 0%, #3B82F6 50%, #8B5CF6 100%)",
            animationDelay: "0.1s"
          }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">Checked in</p>
            <p className="text-4xl font-bold text-white">
              {totalCheckedIn}
              <span className="text-xl font-normal text-white/70 ml-2">of {totalSold}</span>
            </p>
            {totalSold > 0 && (
              <div className="mt-3 h-1.5 w-40 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${checkinPct}%` }} />
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70 mb-2">Live</p>
            <div className="w-3 h-3 rounded-full bg-emerald-400 ml-auto animate-pulse" />
          </div>
        </div>

        {/* Camera scanner */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4 aurora-fade-in-slide" style={{ animationDelay: "0.15s" }}>
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Camera className="h-4 w-4 text-gray-400" /> Camera Scanner
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Point at an attendee's QR code ticket</p>
          </div>

          <div className="relative bg-gray-900 aspect-square overflow-hidden">
            {scanning ? (
              <>
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-52 h-52 relative">
                    <div className="absolute top-0 left-0 w-9 h-9 border-t-3 border-l-3 border-white rounded-tl-lg" style={{ borderWidth: 3 }} />
                    <div className="absolute top-0 right-0 w-9 h-9 border-t-3 border-r-3 border-white rounded-tr-lg" style={{ borderWidth: 3 }} />
                    <div className="absolute bottom-0 left-0 w-9 h-9 border-b-3 border-l-3 border-white rounded-bl-lg" style={{ borderWidth: 3 }} />
                    <div className="absolute bottom-0 right-0 w-9 h-9 border-b-3 border-r-3 border-white rounded-br-lg" style={{ borderWidth: 3 }} />
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-white/30">
                <QrCode className="h-16 w-16 opacity-25" />
                {cameraError && <p className="text-sm text-red-400 text-center px-6">{cameraError}</p>}
              </div>
            )}

            {lastResult && (
              <div
                className={`absolute bottom-0 left-0 right-0 p-4 text-center text-white font-semibold text-sm ${
                  lastResult.success ? "bg-emerald-600/95" : lastResult.alreadyCheckedIn ? "bg-amber-600/95" : "bg-red-600/95"
                }`}
              >
                {lastResult.success ? (
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Checked in: {lastResult.attendeeName}
                  </div>
                ) : lastResult.alreadyCheckedIn ? (
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4" /> Already checked in
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <XCircle className="h-4 w-4" /> {lastResult.error}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4">
            {scanning ? (
              <button className="w-full py-2.5 rounded-full border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors" onClick={stopCamera}>
                Stop Camera
              </button>
            ) : (
              <button className="w-full py-2.5 rounded-full aurora-gradient text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2" onClick={startCamera}>
                <Camera className="h-3.5 w-3.5" /> Start Camera
              </button>
            )}
          </div>
        </div>

        {/* Manual entry */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden aurora-fade-in-slide" style={{ animationDelay: "0.2s" }}>
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <QrCode className="h-4 w-4 text-gray-400" /> Manual Token Entry
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Paste or type a QR token from a ticket</p>
          </div>
          <div className="p-4 flex gap-2">
            <Input
              placeholder="Paste QR token here…"
              value={manualToken}
              onChange={e => setManualToken(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && manualToken.trim()) { handleToken(manualToken); setManualToken(""); } }}
              className="flex-1 rounded-full h-10 text-sm border-gray-200"
            />
            <button
              className="px-5 py-2 rounded-full aurora-gradient text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              disabled={!manualToken.trim()}
              onClick={() => { handleToken(manualToken); setManualToken(""); }}
            >
              Check In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
