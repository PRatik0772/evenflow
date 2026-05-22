import { db, eventsTable, ordersTable, ticketsTable, reminderLogsTable } from "@workspace/db";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { sendEmail, eventReminderEmail } from "./email.js";
import { logger } from "./logger.js";

const APP_URL = (() => {
  const d = process.env["REPLIT_DOMAINS"]?.split(",")[0];
  return d ? `https://${d}` : `http://localhost:${process.env["PORT"] ?? 5000}`;
})();

type ReminderType = "7day" | "1day" | "1hour";

interface ReminderWindow {
  type: ReminderType;
  minHours: number;
  maxHours: number;
}

const WINDOWS: ReminderWindow[] = [
  { type: "1hour", minHours: 0.5, maxHours: 1.5 },
  { type: "1day", minHours: 20, maxHours: 28 },
  { type: "7day", minHours: 6 * 24, maxHours: 8 * 24 },
];

export async function sendPendingReminders(): Promise<void> {
  const now = new Date();

  for (const window of WINDOWS) {
    const windowStart = new Date(now.getTime() + window.minHours * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + window.maxHours * 60 * 60 * 1000);

    const upcomingEvents = await db
      .select()
      .from(eventsTable)
      .where(
        and(
          eq(eventsTable.status, "published"),
          gte(eventsTable.startAt, windowStart),
          lte(eventsTable.startAt, windowEnd),
        ),
      );

    for (const event of upcomingEvents) {
      const alreadySent = await db.query.reminderLogsTable.findFirst({
        where: and(
          eq(reminderLogsTable.eventId, event.id),
          eq(reminderLogsTable.reminderType, window.type),
        ),
      });
      if (alreadySent) continue;

      const paidOrders = await db
        .select()
        .from(ordersTable)
        .where(and(eq(ordersTable.eventId, event.id), eq(ordersTable.status, "paid")));

      const orderIds = paidOrders.map(o => o.id);
      if (orderIds.length === 0) {
        await db.insert(reminderLogsTable).values({ eventId: event.id, reminderType: window.type }).onConflictDoNothing();
        continue;
      }

      const allTickets = await db
        .select()
        .from(ticketsTable)
        .where(inArray(ticketsTable.orderId, orderIds));

      for (const ticket of allTickets) {
        try {
          await sendEmail({
            to: ticket.attendeeEmail,
            subject: `Reminder: ${event.title} is ${window.type === "1hour" ? "starting soon!" : window.type === "1day" ? "tomorrow!" : "in 1 week!"}`,
            html: eventReminderEmail({
              attendeeName: ticket.attendeeName,
              eventTitle: event.title,
              eventStartAt: event.startAt.toISOString(),
              eventVenue: event.venueName ?? null,
              eventVirtualUrl: event.virtualUrl ?? null,
              ticketUrl: `${APP_URL}/tickets/${ticket.qrToken}`,
              reminderType: window.type,
            }),
          });
        } catch (err) {
          logger.error({ err, ticketId: ticket.id }, "Failed to send reminder");
        }
      }

      await db.insert(reminderLogsTable).values({ eventId: event.id, reminderType: window.type }).onConflictDoNothing();
      logger.info({ eventId: event.id, reminderType: window.type, count: allTickets.length }, "Sent reminders");
    }
  }
}

export function startReminderScheduler(): void {
  const INTERVAL_MS = 15 * 60 * 1000;
  logger.info("Reminder scheduler started");
  setInterval(async () => {
    try {
      await sendPendingReminders();
    } catch (err) {
      logger.error({ err }, "Reminder scheduler error");
    }
  }, INTERVAL_MS);
}
