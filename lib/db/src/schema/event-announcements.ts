import { pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { eventsTable } from "./events";

export const eventAnnouncementsTable = pgTable("event_announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => eventsTable.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  recipientCount: integer("recipient_count").notNull().default(0),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});

export type EventAnnouncement = typeof eventAnnouncementsTable.$inferSelect;
