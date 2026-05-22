import { pgTable, uuid, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { eventsTable } from "./events";
import { usersTable } from "./users";

export const eventStaffTable = pgTable(
  "event_staff",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => eventsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.eventId, t.userId] }) }),
);

export type EventStaff = typeof eventStaffTable.$inferSelect;
