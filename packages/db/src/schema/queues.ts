import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { queueStatusEnum } from "./enums";
import { patients } from "./patients";
import { doctors } from "./doctors";
import { polis } from "./polis";

export const queues = pgTable("queues", {
  id: uuid("id").defaultRandom().primaryKey(),
  queueNumber: varchar("queue_number", { length: 20 }).notNull(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  doctorId: uuid("doctor_id").references(() => doctors.id, {
    onDelete: "set null",
  }),
  poliId: uuid("poli_id")
    .notNull()
    .references(() => polis.id, { onDelete: "restrict" }),
  status: queueStatusEnum("status").notNull().default("WAITING"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Queue = typeof queues.$inferSelect;
export type NewQueue = typeof queues.$inferInsert;
