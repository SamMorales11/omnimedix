import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";
import { polis } from "./polis";

export const doctors = pgTable("doctors", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  poliId: uuid("poli_id")
    .notNull()
    .references(() => polis.id, { onDelete: "restrict" }),
  specialization: varchar("specialization", { length: 150 }).notNull(),
  licenseNumber: varchar("license_number", { length: 100 }).notNull().unique(),
  phone: varchar("phone", { length: 30 }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Doctor = typeof doctors.$inferSelect;
export type NewDoctor = typeof doctors.$inferInsert;
