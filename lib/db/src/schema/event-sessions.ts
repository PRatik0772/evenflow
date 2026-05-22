import { pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { eventsTable } from "./events";
import { eventSpeakersTable } from "./event-speakers";

export const eventSessionsTable = pgTable("event_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => eventsTable.id, { onDelete: "cascade" }),
  speakerId: uuid("speaker_id")
    .references(() => eventSpeakersTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  roomName: text("room_name"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type EventSession = typeof eventSessionsTable.$inferSelect;
