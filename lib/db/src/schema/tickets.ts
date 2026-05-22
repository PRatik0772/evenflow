import { pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ordersTable } from "./orders";
import { ticketTiersTable } from "./ticket-tiers";

export const ticketsTable = pgTable("tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => ordersTable.id),
  tierId: uuid("tier_id")
    .notNull()
    .references(() => ticketTiersTable.id),
  tierName: text("tier_name").notNull(),
  priceCents: integer("price_cents").notNull(),
  attendeeName: text("attendee_name").notNull(),
  attendeeEmail: text("attendee_email").notNull(),
  qrToken: text("qr_token").notNull().unique(),
  checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTicketSchema = createInsertSchema(ticketsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof ticketsTable.$inferSelect;
