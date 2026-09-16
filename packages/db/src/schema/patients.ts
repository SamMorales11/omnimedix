import {
  pgTable,
  uuid,
  varchar,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { genderEnum } from "./enums";

export const patients = pgTable(
  "patients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    dateOfBirth: date("date_of_birth").notNull(),
    gender: genderEnum("gender").notNull(),
    phone: varchar("phone", { length: 30 }),
    nik: varchar("nik", { length: 50 }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_patients_nik").on(table.nik),
    index("idx_patients_phone").on(table.phone),
    index("idx_patients_full_name").on(table.fullName),
  ],
);

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
