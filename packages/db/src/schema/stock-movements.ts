import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { stockMovementTypeEnum } from "./enums";
import { medicines } from "./medicines";

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    medicineId: uuid("medicine_id")
      .notNull()
      .references(() => medicines.id, { onDelete: "cascade" }),
    type: stockMovementTypeEnum("type").notNull(), // 'in' | 'out'
    quantity: integer("quantity").notNull(),
    reason: varchar("reason", { length: 255 }), // e.g. 'Prescription dispense', 'Stock procurement', 'Adjustment'
    referenceId: uuid("reference_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_stock_movements_medicine_id").on(table.medicineId),
    index("idx_stock_movements_type").on(table.type),
    index("idx_stock_movements_created_at").on(table.createdAt),
    index("idx_stock_movements_reference_id").on(table.referenceId),
  ],
);

export type StockMovement = typeof stockMovements.$inferSelect;
export type NewStockMovement = typeof stockMovements.$inferInsert;
