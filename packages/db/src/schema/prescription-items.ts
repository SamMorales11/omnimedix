import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { prescriptions } from "./prescriptions";
import { medicines } from "./medicines";

export const prescriptionItems = pgTable(
  "prescription_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    prescriptionId: uuid("prescription_id")
      .notNull()
      .references(() => prescriptions.id, { onDelete: "cascade" }),
    medicineId: uuid("medicine_id")
      .notNull()
      .references(() => medicines.id, { onDelete: "restrict" }),
    dosage: varchar("dosage", { length: 100 }), // e.g. "500 mg", "1 sendok teh"
    quantity: integer("quantity").notNull(),
    instructions: text("instructions").notNull(), // e.g. "3x1 sehari setelah makan"
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_prescription_items_prescription_id").on(table.prescriptionId),
    index("idx_prescription_items_medicine_id").on(table.medicineId),
  ],
);

export type PrescriptionItem = typeof prescriptionItems.$inferSelect;
export type NewPrescriptionItem = typeof prescriptionItems.$inferInsert;
