function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function formatICSDate(date: Date) {
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
}

function escapeICSField(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export type ICSEventInput = {
  uid: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startAt: string | Date;
  endAt: string | Date;
  url?: string | null;
};

export function buildICS(event: ICSEventInput): string {
  const start = typeof event.startAt === "string" ? new Date(event.startAt) : event.startAt;
  const end = typeof event.endAt === "string" ? new Date(event.endAt) : event.endAt;
  const now = new Date();

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EventFlow//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}@eventflow.com`,
    `DTSTAMP:${formatICSDate(now)}`,
    `DTSTART:${formatICSDate(start)}`,
    `DTEND:${formatICSDate(end)}`,
    `SUMMARY:${escapeICSField(event.title)}`,
    event.description ? `DESCRIPTION:${escapeICSField(event.description)}` : null,
    event.location ? `LOCATION:${escapeICSField(event.location)}` : null,
    event.url ? `URL:${event.url}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n");
}

export function downloadICS(event: ICSEventInput, filename = "event.ics") {
  const content = buildICS(event);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatAUD(cents: number): string {
  if (cents === 0) return "Free";
  return `A$${(cents / 100).toFixed(2)}`;
}
