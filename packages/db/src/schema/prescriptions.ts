import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { prescriptionStatusEnum } from "./enums";
import { queues } from "./queues";
import { patients } from "./patients";
import { doctors } from "./doctors";

export const prescriptions = pgTable("prescriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  queueId: uuid("queue_id").references(() => queues.id, {
    onDelete: "set null",
  }),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  doctorId: uuid("doctor_id")
    .notNull()
    .references(() => doctors.id, { onDelete: "restrict" }),
  status: prescriptionStatusEnum("status").notNull().default("PENDING"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Prescription = typeof prescriptions.$inferSelect;
export type NewPrescription = typeof prescriptions.$inferInsert;
