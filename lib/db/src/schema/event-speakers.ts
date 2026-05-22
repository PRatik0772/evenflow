import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { eventsTable } from "./events";

export const eventSpeakersTable = pgTable("event_speakers", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => eventsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  bio: text("bio"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type EventSpeaker = typeof eventSpeakersTable.$inferSelect;
