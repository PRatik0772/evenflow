import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  useListEventSpeakers, getListEventSpeakersQueryKey,
  useCreateEventSpeaker, useUpdateEventSpeaker, useDeleteEventSpeaker,
  useListEventSessions, getListEventSessionsQueryKey,
  useCreateEventSession, useUpdateEventSession, useDeleteEventSession,
  type EventSpeaker, type EventSession,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import {
  Plus, Edit2, Trash2, Loader2, User, Clock, MapPin, Mic,
  ChevronDown, ChevronUp, ArrowUp, ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  eventId: string;
}

// ── Speaker Dialog ─────────────────────────────────────────────────────────────

function SpeakerDialog({
  open,
  onClose,
  eventId,
  speaker,
}: {
  open: boolean;
  onClose: () => void;
  eventId: string;
  speaker?: EventSpeaker;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [name, setName] = useState(speaker?.name ?? "");
  const [bio, setBio] = useState(speaker?.bio ?? "");
  const [photoUrl, setPhotoUrl] = useState(speaker?.photoUrl ?? "");
  const createSpeaker = useCreateEventSpeaker();
  const updateSpeaker = useUpdateEventSpeaker();

  React.useEffect(() => {
    setName(speaker?.name ?? "");
    setBio(speaker?.bio ?? "");
    setPhotoUrl(speaker?.photoUrl ?? "");
  }, [speaker, open]);

  const handleSave = () => {
    if (!name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    const data = { name: name.trim(), bio: bio || undefined, photoUrl: photoUrl || undefined };
    const invalidate = () => qc.invalidateQueries({ queryKey: getListEventSpeakersQueryKey(eventId) });

    if (speaker) {
      updateSpeaker.mutate({ id: eventId, speakerId: speaker.id, data }, {
        onSuccess: () => { invalidate(); onClose(); toast({ title: "Speaker updated" }); },
        onError: (e) => toast({ title: "Error", description: (e.data as any)?.error, variant: "destructive" }),
      });
    } else {
      createSpeaker.mutate({ id: eventId, data }, {
        onSuccess: () => { invalidate(); onClose(); toast({ title: "Speaker added" }); },
        onError: (e) => toast({ title: "Error", description: (e.data as any)?.error, variant: "destructive" }),
      });
    }
  };

  const isPending = createSpeaker.isPending || updateSpeaker.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="aurora-heading text-2xl">{speaker ? "Edit Speaker" : "Add Speaker"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-1.5">Name *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" className="rounded-xl" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-1.5">Bio</label>
            <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Short bio..." rows={3} className="rounded-xl resize-none" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-1.5">Photo URL</label>
            <Input value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="https://..." className="rounded-xl" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-full">Cancel</Button>
          <Button onClick={handleSave} disabled={isPending} className="rounded-full aurora-gradient text-white border-0">
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            {speaker ? "Save Changes" : "Add Speaker"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Session Dialog ─────────────────────────────────────────────────────────────

function SessionDialog({
  open,
  onClose,
  eventId,
  session,
  speakers,
}: {
  open: boolean;
  onClose: () => void;
  eventId: string;
  session?: EventSession;
  speakers: EventSpeaker[];
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [title, setTitle] = useState(session?.title ?? "");
  const [description, setDescription] = useState(session?.description ?? "");
  const [startAt, setStartAt] = useState(session?.startAt ? format(new Date(session.startAt), "yyyy-MM-dd'T'HH:mm") : "");
  const [endAt, setEndAt] = useState(session?.endAt ? format(new Date(session.endAt), "yyyy-MM-dd'T'HH:mm") : "");
  const [roomName, setRoomName] = useState(session?.roomName ?? "");
  const [speakerId, setSpeakerId] = useState(session?.speakerId ?? "");
  const createSession = useCreateEventSession();
  const updateSession = useUpdateEventSession();

  React.useEffect(() => {
    setTitle(session?.title ?? "");
    setDescription(session?.description ?? "");
    setStartAt(session?.startAt ? format(new Date(session.startAt), "yyyy-MM-dd'T'HH:mm") : "");
    setEndAt(session?.endAt ? format(new Date(session.endAt), "yyyy-MM-dd'T'HH:mm") : "");
    setRoomName(session?.roomName ?? "");
    setSpeakerId(session?.speakerId ?? "");
  }, [session, open]);

  const handleSave = () => {
    if (!title.trim() || !startAt || !endAt) {
      toast({ title: "Title, start and end time are required", variant: "destructive" }); return;
    }
    const data = {
      title: title.trim(),
      description: description || undefined,
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      roomName: roomName || undefined,
      // Explicitly pass null to unlink speaker; omit field entirely for create when no speaker chosen
      speakerId: session
        ? (speakerId || null)   // edit: null = unlink
        : (speakerId || undefined), // create: omit if none
    };
    const invalidate = () => qc.invalidateQueries({ queryKey: getListEventSessionsQueryKey(eventId) });

    if (session) {
      updateSession.mutate({ id: eventId, sessionId: session.id, data }, {
        onSuccess: () => { invalidate(); onClose(); toast({ title: "Session updated" }); },
        onError: (e) => toast({ title: "Error", description: (e.data as any)?.error, variant: "destructive" }),
      });
    } else {
      createSession.mutate({ id: eventId, data }, {
        onSuccess: () => { invalidate(); onClose(); toast({ title: "Session added" }); },
        onError: (e) => toast({ title: "Error", description: (e.data as any)?.error, variant: "destructive" }),
      });
    }
  };

  const isPending = createSession.isPending || updateSession.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="aurora-heading text-2xl">{session ? "Edit Session" : "Add Session"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-1.5">Session Title *</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Keynote: The Future of AI" className="rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-1.5">Start Time *</label>
              <Input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-1.5">End Time *</label>
              <Input type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} className="rounded-xl" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-1.5">Room / Stage</label>
            <Input value={roomName} onChange={e => setRoomName(e.target.value)} placeholder="Main Stage" className="rounded-xl" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-1.5">Speaker</label>
            <Select value={speakerId || "none"} onValueChange={v => setSpeakerId(v === "none" ? "" : v)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select a speaker…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No speaker</SelectItem>
                {speakers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-1.5">Description</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What attendees will learn…" rows={3} className="rounded-xl resize-none" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-full">Cancel</Button>
          <Button onClick={handleSave} disabled={isPending} className="rounded-full aurora-gradient text-white border-0">
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            {session ? "Save Changes" : "Add Session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main AgendaTab ─────────────────────────────────────────────────────────────

export function AgendaTab({ eventId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: speakers = [], isLoading: speakersLoading } = useListEventSpeakers(eventId, {
    query: { queryKey: getListEventSpeakersQueryKey(eventId) },
  });
  const { data: sessions = [], isLoading: sessionsLoading } = useListEventSessions(eventId, {
    query: { queryKey: getListEventSessionsQueryKey(eventId) },
  });

  const deleteSpeaker = useDeleteEventSpeaker();
  const deleteSession = useDeleteEventSession();
  const updateSession = useUpdateEventSession();
  const [reordering, setReordering] = useState(false);

  const [speakerDialog, setSpeakerDialog] = useState<{ open: boolean; speaker?: EventSpeaker }>({ open: false });
  const [sessionDialog, setSessionDialog] = useState<{ open: boolean; session?: EventSession }>({ open: false });
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => setExpandedSessions(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleDeleteSpeaker = (speaker: EventSpeaker) => {
    deleteSpeaker.mutate({ id: eventId, speakerId: speaker.id }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListEventSpeakersQueryKey(eventId) }); toast({ title: "Speaker removed" }); },
      onError: (e) => toast({ title: "Error", description: (e.data as any)?.error, variant: "destructive" }),
    });
  };

  const handleDeleteSession = (session: EventSession) => {
    deleteSession.mutate({ id: eventId, sessionId: session.id }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListEventSessionsQueryKey(eventId) }); toast({ title: "Session removed" }); },
      onError: (e) => toast({ title: "Error", description: (e.data as any)?.error, variant: "destructive" }),
    });
  };

  // Move a session up or down within its day group by swapping sortOrder values.
  const handleMoveSession = async (daySessions: EventSession[], idx: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= daySessions.length) return;
    const a = daySessions[idx]!;
    const b = daySessions[targetIdx]!;
    // Swap sort orders — use position-based values if both are 0
    const orderA = idx;
    const orderB = targetIdx;
    setReordering(true);
    try {
      await Promise.all([
        new Promise<void>((resolve, reject) =>
          updateSession.mutate({ id: eventId, sessionId: a.id, data: { title: a.title, startAt: a.startAt, endAt: a.endAt, sortOrder: orderB } }, { onSuccess: () => resolve(), onError: reject })
        ),
        new Promise<void>((resolve, reject) =>
          updateSession.mutate({ id: eventId, sessionId: b.id, data: { title: b.title, startAt: b.startAt, endAt: b.endAt, sortOrder: orderA } }, { onSuccess: () => resolve(), onError: reject })
        ),
      ]);
      qc.invalidateQueries({ queryKey: getListEventSessionsQueryKey(eventId) });
    } catch {
      toast({ title: "Failed to reorder", variant: "destructive" });
    } finally {
      setReordering(false);
    }
  };

  // Group sessions by day
  const sessionsByDay = sessions.reduce<Record<string, EventSession[]>>((acc, s) => {
    const day = format(new Date(s.startAt), "yyyy-MM-dd");
    if (!acc[day]) acc[day] = [];
    acc[day].push(s);
    return acc;
  }, {});

  const isLoading = speakersLoading || sessionsLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Speakers Panel ── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Mic className="h-4 w-4" /> Speakers
          </h3>
          <button
            onClick={() => setSpeakerDialog({ open: true })}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 aurora-gradient text-white rounded-full hover:opacity-90 transition-opacity"
          >
            <Plus className="h-3.5 w-3.5" /> Add Speaker
          </button>
        </div>

        {speakers.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            No speakers yet — add one to link them to sessions.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {speakers.map(speaker => (
              <div key={speaker.id} className="flex items-center gap-4 px-6 py-4">
                {speaker.photoUrl ? (
                  <img src={speaker.photoUrl} alt={speaker.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-gray-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{speaker.name}</p>
                  {speaker.bio && <p className="text-xs text-gray-400 truncate mt-0.5">{speaker.bio}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    className="p-1.5 text-gray-300 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    onClick={() => setSpeakerDialog({ open: true, speaker })}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Speaker?</AlertDialogTitle>
                        <AlertDialogDescription>Sessions linked to this speaker will lose the reference.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-500 text-white hover:bg-red-600 rounded-full" onClick={() => handleDeleteSpeaker(speaker)}>Remove</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Sessions Panel ── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Clock className="h-4 w-4" /> Schedule
          </h3>
          <button
            onClick={() => setSessionDialog({ open: true })}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 aurora-gradient text-white rounded-full hover:opacity-90 transition-opacity"
          >
            <Plus className="h-3.5 w-3.5" /> Add Session
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            No sessions yet — add your first agenda item.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {Object.entries(sessionsByDay).map(([day, daySessions]) => (
              <div key={day}>
                <div className="px-6 py-2 bg-gray-50/60">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                    {format(new Date(day + "T00:00:00"), "EEEE, MMMM d")}
                  </span>
                </div>
                {daySessions.map((session, idx) => {
                  const expanded = expandedSessions.has(session.id);
                  const speaker = speakers.find(s => s.id === session.speakerId);
                  const durationMins = Math.round((new Date(session.endAt).getTime() - new Date(session.startAt).getTime()) / 60000);
                  return (
                    <div key={session.id} className="px-6 py-4">
                      <div className="flex items-start gap-4">
                        {/* Reorder column */}
                        <div className="flex flex-col gap-0.5 pt-0.5 shrink-0">
                          <button
                            disabled={idx === 0 || reordering}
                            className="p-1 text-gray-200 hover:text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                            onClick={() => handleMoveSession(daySessions, idx, "up")}
                            title="Move up"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            disabled={idx === daySessions.length - 1 || reordering}
                            className="p-1 text-gray-200 hover:text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                            onClick={() => handleMoveSession(daySessions, idx, "down")}
                            title="Move down"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                        </div>
                        {/* Time column */}
                        <div className="w-20 shrink-0 text-right pt-1">
                          <p className="text-xs font-bold text-gray-700">{format(new Date(session.startAt), "h:mm a")}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{durationMins}m</p>
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-800 text-sm leading-snug">{session.title}</p>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
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
                            <div className="flex items-center gap-1 shrink-0">
                              {session.description && (
                                <button
                                  className="p-1.5 text-gray-300 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                                  onClick={() => toggleExpand(session.id)}
                                >
                                  {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                </button>
                              )}
                              <button
                                className="p-1.5 text-gray-300 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                                onClick={() => setSessionDialog({ open: true, session })}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-2xl">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Session?</AlertDialogTitle>
                                    <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                                    <AlertDialogAction className="bg-red-500 text-white hover:bg-red-600 rounded-full" onClick={() => handleDeleteSession(session)}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                          {expanded && session.description && (
                            <p className="text-sm text-gray-500 mt-2 leading-relaxed">{session.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <SpeakerDialog
        open={speakerDialog.open}
        onClose={() => setSpeakerDialog({ open: false })}
        eventId={eventId}
        speaker={speakerDialog.speaker}
      />
      <SessionDialog
        open={sessionDialog.open}
        onClose={() => setSessionDialog({ open: false })}
        eventId={eventId}
        session={sessionDialog.session}
        speakers={speakers}
      />
    </div>
  );
}
