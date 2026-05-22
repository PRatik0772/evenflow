import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";
import { eventsTable } from "./events";

export const reminderLogsTable = pgTable("reminder_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
  reminderType: text("reminder_type", { enum: ["7day", "1day", "1hour"] }).notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ReminderLog = typeof reminderLogsTable.$inferSelect;
