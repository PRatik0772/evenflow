import { pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { eventsTable } from "./events";

export const ticketTiersTable = pgTable("ticket_tiers", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => eventsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  priceCents: integer("price_cents").notNull().default(0),
  quantity: integer("quantity"),
  sold: integer("sold").notNull().default(0),
  saleStartsAt: timestamp("sale_starts_at", { withTimezone: true }),
  saleEndsAt: timestamp("sale_ends_at", { withTimezone: true }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTicketTierSchema = createInsertSchema(ticketTiersTable).omit({
  id: true,
  sold: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTicketTier = z.infer<typeof insertTicketTierSchema>;
export type TicketTier = typeof ticketTiersTable.$inferSelect;
