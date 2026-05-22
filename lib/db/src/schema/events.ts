import { pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const eventsTable = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  organiserId: uuid("organiser_id")
    .notNull()
    .references(() => usersTable.id),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  venueName: text("venue_name"),
  venueAddress: text("venue_address"),
  virtualUrl: text("virtual_url"),
  capacity: integer("capacity"),
  bannerUrl: text("banner_url"),
  status: text("status", {
    enum: ["draft", "published", "cancelled", "completed"],
  })
    .notNull()
    .default("draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;
