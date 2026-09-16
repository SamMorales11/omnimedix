import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { prescriptionStatusEnum } from "./enums";
import { queues } from "./queues";
import { patients } from "./patients";
import { doctors } from "./doctors";

export const prescriptions = pgTable(
  "prescriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    queueId: uuid("queue_id").references(() => queues.id, {
      onDelete: "set null",
    }),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "restrict" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    status: prescriptionStatusEnum("status").notNull().default("pending"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_prescriptions_queue_id").on(table.queueId),
    index("idx_prescriptions_doctor_id").on(table.doctorId),
    index("idx_prescriptions_patient_id").on(table.patientId),
    index("idx_prescriptions_status").on(table.status),
  ],
);

export type Prescription = typeof prescriptions.$inferSelect;
export type NewPrescription = typeof prescriptions.$inferInsert;
