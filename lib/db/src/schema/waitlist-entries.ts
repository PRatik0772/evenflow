import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";
import { ticketTiersTable } from "./ticket-tiers";

export const waitlistEntriesTable = pgTable("waitlist_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  tierId: uuid("tier_id").notNull().references(() => ticketTiersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
});

export type WaitlistEntry = typeof waitlistEntriesTable.$inferSelect;
