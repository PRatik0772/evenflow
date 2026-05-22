import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  useListEventAnnouncements,
  getListEventAnnouncementsQueryKey,
  useSendEventAnnouncement,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { Megaphone, Loader2, Send, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props {
  eventId: string;
  eventTitle: string;
}

export function AnnouncementsTab({ eventId, eventTitle }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState(false);

  const { data: announcements = [], isLoading } = useListEventAnnouncements(eventId, {
    query: { queryKey: getListEventAnnouncementsQueryKey(eventId), enabled: !!eventId },
  });

  const send = useSendEventAnnouncement();

  const handleSend = () => {
    if (!subject.trim() || !body.trim()) {
      toast({ title: "Subject and message are required", variant: "destructive" });
      return;
    }
    send.mutate(
      { id: eventId, data: { subject: subject.trim(), body: body.trim() } },
      {
        onSuccess: (result) => {
          toast({
            title: "Announcement sent",
            description: `Sent to ${result.recipientCount} attendee${result.recipientCount !== 1 ? "s" : ""}.`,
          });
          setSubject("");
          setBody("");
          setPreview(false);
          queryClient.invalidateQueries({ queryKey: getListEventAnnouncementsQueryKey(eventId) });
        },
        onError: (err) =>
          toast({
            title: "Failed to send",
            description: (err.data as any)?.error || "Try again",
            variant: "destructive",
          }),
      },
    );
  };

  return (
    <div className="space-y-6">
      {/* Compose form */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Megaphone className="h-4 w-4" /> Send Announcement
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Write a message to all paid attendees of <strong className="text-gray-600">{eventTitle}</strong>.
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
              Subject
            </label>
            <Input
              placeholder="e.g. Important update about the venue"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="rounded-xl border-gray-200 text-sm"
              disabled={send.isPending}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
              Message
            </label>
            <Textarea
              placeholder="Write your message here. Plain text only — line breaks are preserved."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              className="rounded-xl border-gray-200 text-sm resize-none"
              disabled={send.isPending}
            />
          </div>

          {/* Preview panel */}
          {preview && subject && body && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-sm">
              <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-2">Email Preview</p>
              <p className="font-semibold text-gray-800 mb-1">
                [{eventTitle}] {subject}
              </p>
              <div className="text-gray-600 whitespace-pre-wrap leading-relaxed">{body}</div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-gray-200 text-gray-600 text-sm"
              onClick={() => setPreview(!preview)}
              disabled={!subject || !body}
            >
              {preview ? "Hide Preview" : "Preview Email"}
            </Button>

            <button
              className="inline-flex items-center gap-2 px-5 py-2 aurora-gradient text-white text-sm font-medium rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
              onClick={handleSend}
              disabled={send.isPending || !subject.trim() || !body.trim()}
            >
              {send.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {send.isPending ? "Sending…" : "Send to All Attendees"}
            </button>
          </div>
        </div>
      </div>

      {/* Send history */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Clock className="h-4 w-4" /> Send History
          </h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-200" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            No announcements sent yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-50 hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-gray-400 uppercase tracking-wider py-3">
                    Date
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-gray-400 uppercase tracking-wider py-3">
                    Subject
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-gray-400 uppercase tracking-wider py-3">
                    Recipients
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((a) => (
                  <TableRow key={a.id} className="border-gray-50 hover:bg-gray-50/50">
                    <TableCell className="py-4 text-sm text-gray-500 whitespace-nowrap">
                      {format(new Date(a.sentAt), "d MMM yyyy, h:mm a")}
                    </TableCell>
                    <TableCell className="py-4">
                      <p className="font-semibold text-gray-800 text-sm">{a.subject}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{a.body}</p>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">
                        <Users className="h-3 w-3" />
                        {a.recipientCount}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
