import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { genderEnum } from "./enums";

export const patients = pgTable("patients", {
  id: uuid("id").defaultRandom().primaryKey(),
  nationalId: varchar("national_id", { length: 50 }).notNull().unique(), // NIK / No KTP
  name: varchar("name", { length: 255 }).notNull(),
  birthDate: varchar("birth_date", { length: 10 }).notNull(), // Format: YYYY-MM-DD
  gender: genderEnum("gender").notNull(),
  phone: varchar("phone", { length: 30 }),
  address: text("address"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
