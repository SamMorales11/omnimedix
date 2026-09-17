import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { queueStatusEnum } from "./enums";
import { patients } from "./patients";
import { doctors } from "./doctors";
import { polis } from "./polis";

export const queues = pgTable(
  "queues",
  {
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
    status: queueStatusEnum("status").notNull().default("waiting"),
    bookingCode: varchar("booking_code", { length: 50 }).unique(),
    queueDate: date("queue_date").notNull().defaultNow(),
    diagnosis: text("diagnosis"),
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
    index("idx_queues_date_status").on(table.queueDate, table.status),
    index("idx_queues_patient_id").on(table.patientId),
    index("idx_queues_doctor_id").on(table.doctorId),
    index("idx_queues_poli_id").on(table.poliId),
    index("idx_queues_booking_code").on(table.bookingCode),
  ],
);

export type Queue = typeof queues.$inferSelect;
export type NewQueue = typeof queues.$inferInsert;
