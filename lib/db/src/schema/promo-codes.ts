import { pgTable, text, uuid, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { eventsTable } from "./events";

export const promoCodesTable = pgTable("promo_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  type: text("type", { enum: ["percentage", "fixed"] }).notNull(),
  value: integer("value").notNull(),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PromoCode = typeof promoCodesTable.$inferSelect;
export type InsertPromoCode = typeof promoCodesTable.$inferInsert;
